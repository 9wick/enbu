/**
 * 自動待機ロジック
 *
 * このモジュールはブラウザ内の要素が利用可能になるまで自動的に待機する機能を提供する。
 * click、type、fillなどのインタラクティブなコマンドの実行前に自動的に呼び出され、
 * 要素が見つかるまでポーリングを行う。
 */

import { Result, ok, err } from 'neverthrow';
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
export const autoWait = async (
  selector: string | undefined,
  context: ExecutionContext,
): Promise<Result<AutoWaitResult | undefined, AgentBrowserError>> => {
  debugLog(`autoWait start: selector=${selector}`);
  // セレクタがない場合はスキップ
  if (!selector) {
    debugLog('no selector, skipping');
    return ok(undefined);
  }

  const startTime = Date.now();
  const { autoWaitTimeoutMs, autoWaitIntervalMs, executeOptions } = context;
  debugLog(`timeout=${autoWaitTimeoutMs}ms, interval=${autoWaitIntervalMs}ms`);

  let pollCount = 0;
  // ポーリングループ
  while (true) {
    pollCount++;
    debugLog(`poll #${pollCount}: calling snapshot...`);
    // snapshot取得（全要素を対象とする。-iオプションはインタラクティブ要素のみになり、
    // assertVisibleなどで静的テキスト要素が見つからなくなるため使用しない）
    const snapshotResult = await browserSnapshot(executeOptions);
    debugLog(`poll #${pollCount}: snapshot done, isOk=${snapshotResult.isOk()}`);

    // snapshotのパース失敗は致命的エラー
    if (snapshotResult.isErr()) {
      debugLog(`poll #${pollCount}: error`, snapshotResult.error);
      return err(snapshotResult.error);
    }

    // 出力データからrefsを取得
    const snapshotOutput = snapshotResult.value;
    if (!snapshotOutput.success || !snapshotOutput.data) {
      debugLog(`poll #${pollCount}: snapshot failed or no data`);
      return err({
        type: 'command_failed',
        message: snapshotOutput.error || 'Snapshot failed',
        command: 'snapshot',
        args: [],
        exitCode: 1,
        stderr: '',
        errorMessage: snapshotOutput.error,
      });
    }

    const refs = snapshotOutput.data.refs;
    debugLog(`poll #${pollCount}: refs count=${Object.keys(refs).length}`);

    // セレクタに一致する要素を検索
    const matchResult = findMatchingRefId(selector, refs);

    // 複数マッチした場合はエラーを返す（agent-browserと同じ動作）
    if (matchResult.type === 'multiple') {
      debugLog(
        `poll #${pollCount}: multiple elements matched! refIds=${matchResult.refIds.join(', ')}`,
      );
      return err({
        type: 'validation_error',
        message: `Selector "${selector}" matched ${matchResult.refIds.length} elements. Use a more specific selector or specify index.`,
        command: 'auto-wait',
        args: [selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      });
    }

    // 一意にマッチした場合は成功
    if (matchResult.type === 'found') {
      const resolvedRef = `@${matchResult.refId}`;
      debugLog(
        `poll #${pollCount}: element found! refId=${matchResult.refId}, resolvedRef=${resolvedRef}`,
      );
      return ok({ resolvedRef });
    }

    // タイムアウトチェック
    const elapsed = Date.now() - startTime;
    debugLog(`poll #${pollCount}: not found, elapsed=${elapsed}ms`);
    if (elapsed >= autoWaitTimeoutMs) {
      debugLog(`poll #${pollCount}: TIMEOUT`);
      return err({
        type: 'timeout',
        command: 'auto-wait',
        args: [selector],
        timeoutMs: autoWaitTimeoutMs,
      });
    }

    // 次のポーリングまで待機
    debugLog(`poll #${pollCount}: sleeping ${autoWaitIntervalMs}ms...`);
    await sleep(autoWaitIntervalMs);
  }
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
