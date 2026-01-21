/**
 * 汎用待機ロジック
 *
 * checkFuncがnull以外を返すまでポーリングして待機する。
 * タイムアウト、ポーリング間隔はExecutionContextから取得する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import type { ExecutionContext } from './result';

/**
 * デバッグログ用（stderrに出力してno-consoleルールを回避）
 */
const DEBUG = process.env.DEBUG_FLOW === '1';
const debugLog = (msg: string, ...args: unknown[]) => {
  if (DEBUG) process.stderr.write(`[wait-until] ${msg} ${args.map(String).join(' ')}\n`);
};

/**
 * checkFuncの結果型
 *
 * - found: 要素が見つかった（Tを含む）
 * - not_found: まだ見つからない（ポーリング継続）
 * - error: エラー発生（即座に失敗）
 */
export type CheckResult<T> =
  | { readonly type: 'found'; readonly value: T }
  | { readonly type: 'not_found' }
  | { readonly type: 'error'; readonly error: AgentBrowserError };

/**
 * waitUntilのオプション
 */
export type WaitUntilOptions = {
  /** タイムアウト時のエラーメッセージに含めるセレクタ文字列 */
  readonly selectorForError: string;
  /** コマンド名（エラーメッセージ用） */
  readonly commandName: string;
};

/**
 * ポーリングイテレーションの結果型
 *
 * - found: 要素が見つかった（Tを含む）
 * - continue: まだ見つからない（ポーリング継続）
 */
type PollIterationResult<T> =
  | { readonly type: 'found'; readonly value: T }
  | { readonly type: 'continue' };

/**
 * 指定ミリ秒待機
 *
 * @param ms - 待機するミリ秒数
 * @returns 待機が完了したら解決されるPromise
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * タイムアウトエラーを生成する
 *
 * @param options - waitUntilオプション
 * @param timeoutMs - タイムアウト時間
 * @returns AgentBrowserError
 */
const createTimeoutError = (options: WaitUntilOptions, timeoutMs: number): AgentBrowserError => ({
  type: 'timeout',
  command: options.commandName,
  args: [options.selectorForError],
  timeoutMs,
});

/**
 * 単一のポーリングイテレーションを実行する
 *
 * @param checkFunc - チェック関数
 * @param context - 実行コンテキスト
 * @param options - オプション
 * @param startTime - 処理開始時刻
 * @param pollCount - 現在のポーリング回数
 * @returns 結果を含むResultAsync
 */
const executePollIteration = <T>(
  checkFunc: () => ResultAsync<CheckResult<T>, AgentBrowserError>,
  context: ExecutionContext,
  options: WaitUntilOptions,
  startTime: number,
  pollCount: number,
): ResultAsync<PollIterationResult<T>, AgentBrowserError> => {
  debugLog(`poll #${pollCount}: checking...`);

  return checkFunc().andThen((result) => {
    if (result.type === 'found') {
      debugLog(`poll #${pollCount}: found!`);
      return okAsync({ type: 'found' as const, value: result.value });
    }

    if (result.type === 'error') {
      debugLog(`poll #${pollCount}: error`, result.error);
      return errAsync(result.error);
    }

    // not_found: タイムアウトチェック
    const elapsed = Date.now() - startTime;
    debugLog(`poll #${pollCount}: not found, elapsed=${elapsed}ms`);

    if (elapsed >= context.autoWaitTimeoutMs) {
      debugLog(`poll #${pollCount}: TIMEOUT`);
      return errAsync(createTimeoutError(options, context.autoWaitTimeoutMs));
    }

    // 継続
    debugLog(`poll #${pollCount}: will continue...`);
    return okAsync({ type: 'continue' as const });
  });
};

/**
 * 次のポーリング実行のためのコンテキスト
 */
type NextPollContext<T> = {
  readonly checkFunc: () => ResultAsync<CheckResult<T>, AgentBrowserError>;
  readonly context: ExecutionContext;
  readonly options: WaitUntilOptions;
  readonly startTime: number;
  readonly pollCount: number;
};

/**
 * 次のポーリングまで待機する
 *
 * @param nextContext - 次のポーリングのコンテキスト
 * @returns 待機後のコンテキスト
 */
const sleepAndPollNext = <T>(
  nextContext: NextPollContext<T>,
): ResultAsync<NextPollContext<T>, never> =>
  ResultAsync.fromSafePromise(sleep(nextContext.context.autoWaitIntervalMs)).map(
    (): NextPollContext<T> => nextContext,
  );

/**
 * 次のポーリングを再帰的に実行する
 *
 * @param ctx - 次のポーリングのコンテキスト
 * @returns 結果を含むResultAsync
 */
const continuePolling = <T>(ctx: NextPollContext<T>): ResultAsync<T, AgentBrowserError> =>
  pollRecursively(ctx.checkFunc, ctx.context, ctx.options, ctx.startTime, ctx.pollCount);

/**
 * ポーリング結果を処理し、見つかればOK、継続なら次のポーリングを実行する
 *
 * @param result - ポーリングイテレーションの結果
 * @param checkFunc - チェック関数
 * @param context - 実行コンテキスト
 * @param options - オプション
 * @param startTime - 処理開始時刻
 * @param pollCount - 現在のポーリング回数
 * @returns 結果を含むResultAsync
 */
const handlePollResult = <T>(
  result: PollIterationResult<T>,
  checkFunc: () => ResultAsync<CheckResult<T>, AgentBrowserError>,
  context: ExecutionContext,
  options: WaitUntilOptions,
  startTime: number,
  pollCount: number,
): ResultAsync<T, AgentBrowserError> => {
  if (result.type === 'found') {
    // 見つかった
    return okAsync(result.value);
  }

  // 次のポーリングまで待機してから再帰
  const nextContext: NextPollContext<T> = {
    checkFunc,
    context,
    options,
    startTime,
    pollCount: pollCount + 1,
  };
  return sleepAndPollNext(nextContext).andThen(continuePolling);
};

/**
 * 再帰的にポーリングを実行する
 *
 * @param checkFunc - チェック関数
 * @param context - 実行コンテキスト
 * @param options - オプション
 * @param startTime - 処理開始時刻
 * @param pollCount - 現在のポーリング回数
 * @returns 結果を含むResultAsync
 */
const pollRecursively = <T>(
  checkFunc: () => ResultAsync<CheckResult<T>, AgentBrowserError>,
  context: ExecutionContext,
  options: WaitUntilOptions,
  startTime: number,
  pollCount: number,
): ResultAsync<T, AgentBrowserError> =>
  executePollIteration(checkFunc, context, options, startTime, pollCount)
    .map((result) => ({
      result,
      checkFunc,
      context,
      options,
      startTime,
      pollCount,
    }))
    .andThen(({ result: pollResult, ...params }) =>
      handlePollResult(
        pollResult,
        params.checkFunc,
        params.context,
        params.options,
        params.startTime,
        params.pollCount,
      ),
    );

/**
 * checkFuncがfoundを返すまでポーリングして待機する
 *
 * @param checkFunc - チェック関数。found/not_found/errorのいずれかを返す
 * @param context - 実行コンテキスト（タイムアウト時間、ポーリング間隔を含む）
 * @param options - オプション（エラーメッセージ用のセレクタ文字列など）
 * @returns 成功時: checkFuncが返したT、失敗時: AgentBrowserError
 */
export const waitUntil = <T>(
  checkFunc: () => ResultAsync<CheckResult<T>, AgentBrowserError>,
  context: ExecutionContext,
  options: WaitUntilOptions,
): ResultAsync<T, AgentBrowserError> => {
  debugLog(`waitUntil start: selector=${options.selectorForError}`);
  debugLog(`timeout=${context.autoWaitTimeoutMs}ms, interval=${context.autoWaitIntervalMs}ms`);

  const startTime = Date.now();
  return pollRecursively(checkFunc, context, options, startTime, 1);
};
