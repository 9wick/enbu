/**
 * 自動待機ロジック
 *
 * このモジュールはブラウザ内の要素が利用可能になるまで自動的に待機する機能を提供する。
 * click、type、fillなどのインタラクティブなコマンドの実行前に自動的に呼び出され、
 * 要素が見つかるまでポーリングを行う。
 */

import { type Result, ResultAsync, ok, err, okAsync, errAsync } from 'neverthrow';
import { browserSnapshot } from '@packages/agent-browser-adapter';
import type { AgentBrowserError, SnapshotRefs } from '@packages/agent-browser-adapter';
import type { ExecutionContext } from './result';

// デバッグログ用（stderrに出力してno-consoleルールを回避）
const DEBUG = process.env.DEBUG_FLOW === '1';
const debugLog = (msg: string, ...args: unknown[]) => {
  if (DEBUG) process.stderr.write(`[auto-wait] ${msg} ${args.map(String).join(' ')}\n`);
};

/**
 * autoWaitの結果
 * resolvedRef: agent-browserで使用可能な@ref形式のセレクタ
 */
export type AutoWaitResult = {
  resolvedRef: string;
};

/**
 * ポーリングの結果型（内部使用）
 * - continue: 要素が見つからなかったので次のポーリングへ
 * - done: 成功または失敗で終了
 */
type PollResult =
  | { type: 'continue' }
  | { type: 'done'; result: Result<AutoWaitResult, AgentBrowserError> };

/**
 * スナップショット取得結果を処理し、refsを取得する
 *
 * スナップショット取得が成功し、データが存在する場合はrefsを返す。
 * 失敗の場合はエラーをそのまま返す。
 *
 * @param snapshotResult - browserSnapshot関数の実行結果
 * @returns 成功時: SnapshotRefs、失敗時: AgentBrowserError
 */
const processSnapshotResult = (
  snapshotResult: Awaited<ReturnType<typeof browserSnapshot>>,
): Result<SnapshotRefs, AgentBrowserError> => {
  return snapshotResult.map((snapshotOutput) => snapshotOutput.refs);
};

/**
 * マッチング結果を処理し、適切なPollResultを返す
 *
 * - found: 成功として解決されたrefを返す
 * - multiple: command_execution_failedを返す
 * - not_found: continueを返す（継続してポーリングする）
 *
 * @param matchResult - findMatchingRefIdの実行結果
 * @param selector - 検索に使用したセレクタ（エラーメッセージ用）
 * @returns PollResult
 */
const handleMatchResult = (matchResult: MatchResult, selector: string): PollResult => {
  if (matchResult.type === 'found') {
    return {
      type: 'done',
      result: ok({ resolvedRef: `@${matchResult.refId}` }),
    };
  }
  if (matchResult.type === 'multiple') {
    return {
      type: 'done',
      result: err({
        type: 'command_execution_failed',
        message: `Selector "${selector}" matched ${matchResult.refIds.length} elements. Use a more specific selector or specify index.`,
        command: 'auto-wait',
        rawError: `Multiple matches: ${matchResult.refIds.join(', ')}`,
      }),
    };
  }
  return { type: 'continue' };
};

/**
 * タイムアウトをチェックする
 *
 * 経過時間がタイムアウト時間を超えている場合はdone(err)を返す。
 * 超えていない場合はcontinueを返す（継続してポーリングする）。
 *
 * @param startTime - 処理開始時刻（ミリ秒）
 * @param timeoutMs - タイムアウト時間（ミリ秒）
 * @param selector - 検索に使用したセレクタ（エラーメッセージ用）
 * @returns PollResult
 */
const checkTimeout = (startTime: number, timeoutMs: number, selector: string): PollResult => {
  const elapsed = Date.now() - startTime;
  if (elapsed >= timeoutMs) {
    return {
      type: 'done',
      result: err({
        type: 'timeout',
        command: 'auto-wait',
        args: [selector],
        timeoutMs,
      }),
    };
  }
  return { type: 'continue' };
};

/**
 * 単一のポーリングイテレーションを実行する
 *
 * @param selector - 検索するセレクタ
 * @param context - 実行コンテキスト
 * @param startTime - 処理開始時刻
 * @param pollCount - 現在のポーリング回数
 * @returns PollResultを含むResultAsync
 */
const executePollIteration = (
  selector: string,
  context: ExecutionContext,
  startTime: number,
  pollCount: number,
): ResultAsync<PollResult, AgentBrowserError> => {
  debugLog(`poll #${pollCount}: calling snapshot...`);

  return browserSnapshot(context.executeOptions).andThen((snapshotOutput) => {
    debugLog(`poll #${pollCount}: snapshot done`);

    return processSnapshotResult(ok(snapshotOutput)).match(
      (refs) => {
        debugLog(`poll #${pollCount}: refs count=${Object.keys(refs).length}`);

        // セレクタに一致する要素を検索
        const matchResult = findMatchingRefId(selector, refs);

        // マッチング結果を処理
        const pollResult = handleMatchResult(matchResult, selector);
        if (pollResult.type === 'done') {
          pollResult.result.match(
            (value) =>
              debugLog(`poll #${pollCount}: element found! resolvedRef=${value.resolvedRef}`),
            () => debugLog(`poll #${pollCount}: multiple elements matched!`),
          );
          return okAsync(pollResult);
        }

        // タイムアウトチェック
        debugLog(`poll #${pollCount}: not found, elapsed=${Date.now() - startTime}ms`);
        const timeoutResult = checkTimeout(startTime, context.autoWaitTimeoutMs, selector);
        if (timeoutResult.type === 'done') {
          debugLog(`poll #${pollCount}: TIMEOUT`);
          return okAsync(timeoutResult);
        }

        debugLog(`poll #${pollCount}: will continue...`);
        const continueResult: PollResult = { type: 'continue' };
        return okAsync(continueResult);
      },
      (error) => {
        debugLog(`poll #${pollCount}: error`, error);
        return errAsync(error);
      },
    );
  });
};

/**
 * sleep後に次のポーリングを実行する
 *
 * @param selector - 検索するセレクタ
 * @param context - 実行コンテキスト
 * @param startTime - 処理開始時刻
 * @param pollCount - 現在のポーリング回数
 * @returns AutoWaitResultを含むResultAsync
 */
const sleepAndPollNext = (
  selector: string,
  context: ExecutionContext,
  startTime: number,
  pollCount: number,
): ResultAsync<AutoWaitResult, AgentBrowserError> =>
  ResultAsync.fromSafePromise(sleep(context.autoWaitIntervalMs)).andThen(() =>
    pollRecursively(selector, context, startTime, pollCount + 1),
  );

/**
 * 再帰的にポーリングを実行する
 *
 * @param selector - 検索するセレクタ
 * @param context - 実行コンテキスト
 * @param startTime - 処理開始時刻
 * @param pollCount - 現在のポーリング回数
 * @returns AutoWaitResultを含むResultAsync
 */
const pollRecursively = (
  selector: string,
  context: ExecutionContext,
  startTime: number,
  pollCount: number,
): ResultAsync<AutoWaitResult, AgentBrowserError> =>
  executePollIteration(selector, context, startTime, pollCount).andThen((pollResult) => {
    if (pollResult.type === 'done') {
      // 成功または失敗で終了
      return pollResult.result.match(
        (value) => okAsync(value),
        (error) => errAsync(error),
      );
    }

    // 次のポーリングまで待機してから再帰
    return sleepAndPollNext(selector, context, startTime, pollCount);
  });

/**
 * 要素の出現を待機する
 *
 * セレクタに一致する要素がブラウザ内に出現するまで、指定された間隔でポーリングを行う。
 * タイムアウト時間内に要素が見つからない場合はエラーを返す。
 *
 * セレクタがundefinedの場合は待機をスキップする（待機不要なコマンドの場合）。
 *
 * @param selector - 待機する要素のセレクタ（@e1形式の参照ID、またはテキスト/ロール名）
 * @param context - 実行コンテキスト（タイムアウト時間、ポーリング間隔などを含む）
 * @returns 成功時: 解決されたrefを含む結果、失敗時: AgentBrowserError
 */
export const autoWait = (
  selector: string | undefined,
  context: ExecutionContext,
): ResultAsync<AutoWaitResult | undefined, AgentBrowserError> => {
  debugLog(`autoWait start: selector=${selector}`);

  // セレクタがない場合はスキップ
  if (!selector) {
    debugLog('no selector, skipping');
    return okAsync(undefined);
  }

  const startTime = Date.now();
  debugLog(`timeout=${context.autoWaitTimeoutMs}ms, interval=${context.autoWaitIntervalMs}ms`);

  return pollRecursively(selector, context, startTime, 1);
};

/**
 * セレクタマッチングの結果型
 *
 * - found: 一意にマッチした場合、refIdを含む
 * - not_found: マッチしなかった場合
 * - multiple: 複数マッチした場合、マッチしたrefIdの配列を含む
 */
type MatchResult =
  | { type: 'found'; refId: string }
  | { type: 'not_found' }
  | { type: 'multiple'; refIds: string[] };

/**
 * @ref形式のセレクタを検索する
 *
 * @param selector - @e1形式のセレクタ
 * @param refs - snapshotから取得した要素参照マップ
 * @returns マッチ結果
 */
const findRefSelector = (selector: string, refs: SnapshotRefs): MatchResult => {
  const refId = selector.slice(1);
  return refId in refs ? { type: 'found', refId } : { type: 'not_found' };
};

/**
 * 要素がセレクタにマッチするかどうかを判定する
 *
 * @param ref - 要素情報
 * @param selector - 検索するテキストまたはロール
 * @returns マッチする場合はtrue
 */
const isMatchingElement = (ref: { name: string; role: string }, selector: string): boolean => {
  return ref.name.includes(selector) || ref.role === selector || ref.name === selector;
};

/**
 * マッチしたrefIdの配列からMatchResultを生成する
 *
 * @param matchedRefIds - マッチしたrefIdの配列
 * @returns マッチ結果
 */
const toMatchResult = (matchedRefIds: string[]): MatchResult => {
  if (matchedRefIds.length === 0) {
    return { type: 'not_found' };
  }
  if (matchedRefIds.length === 1) {
    return { type: 'found', refId: matchedRefIds[0] };
  }
  return { type: 'multiple', refIds: matchedRefIds };
};

/**
 * セレクタに一致する要素のrefIdを検索する
 *
 * 以下の2つの形式のセレクタをサポート:
 * 1. @e1のような参照ID形式: refsマップ内にキーとして存在するかチェック
 * 2. テキストまたはロール: refs内の要素のnameまたはroleとマッチするかチェック
 *
 * agent-browserと同様に、複数マッチした場合はエラーとして扱う。
 *
 * @param selector - 検索する要素のセレクタ
 * @param refs - snapshotコマンドから取得した要素参照のマップ
 * @returns マッチ結果（found/not_found/multiple）
 */
const findMatchingRefId = (selector: string, refs: SnapshotRefs): MatchResult => {
  // @e1 形式の参照IDの場合
  if (selector.startsWith('@')) {
    return findRefSelector(selector, refs);
  }

  // テキストまたはロールでマッチング（全てのマッチを収集）
  const matchedRefIds = Object.entries(refs)
    .filter(([, ref]) => isMatchingElement(ref, selector))
    .map(([refId]) => refId);

  return toMatchResult(matchedRefIds);
};

/**
 * 指定ミリ秒待機
 *
 * ポーリング間隔を制御するための非同期待機関数。
 * Promiseベースのタイマーを使用し、指定されたミリ秒数だけ処理を一時停止する。
 *
 * @param ms - 待機するミリ秒数
 * @returns 待機が完了したら解決されるPromise
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
