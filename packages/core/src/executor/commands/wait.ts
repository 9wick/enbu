import { type ResultAsync, errAsync } from 'neverthrow';
import {
  browserWaitForMs,
  browserWaitForSelector,
  browserWaitForText,
  browserWaitForLoad,
  browserWaitForUrl,
  browserWaitForFunction,
  asSelector,
  asJsExpression,
} from '@packages/agent-browser-adapter';
import type { AgentBrowserError, LoadState, ExecuteOptions } from '@packages/agent-browser-adapter';
import type { WaitCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * 出力をCommandResultに変換するヘルパー関数を生成する
 *
 * @param startTime - コマンド実行開始時刻（ミリ秒）
 * @returns CommandResult変換関数
 */
const createResultMapper =
  (startTime: number) =>
  <T>(output: T): CommandResult => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  });

/**
 * セレクタ指定のwaitを処理する
 *
 * @param selector - 待機する要素のセレクタ
 * @param options - 実行オプション
 * @param toResult - CommandResult変換関数
 * @returns コマンド実行結果
 */
const handleWaitSelector = (
  selector: string,
  options: ExecuteOptions,
  toResult: <T>(output: T) => CommandResult,
): ResultAsync<CommandResult, AgentBrowserError> =>
  asSelector(selector).match(
    (sel) => browserWaitForSelector(sel, options).map(toResult),
    (error) => errAsync(error),
  );

/**
 * JS式指定のwaitを処理する
 *
 * @param fn - 待機するJS式
 * @param options - 実行オプション
 * @param toResult - CommandResult変換関数
 * @returns コマンド実行結果
 */
const handleWaitFunction = (
  fn: string,
  options: ExecuteOptions,
  toResult: <T>(output: T) => CommandResult,
): ResultAsync<CommandResult, AgentBrowserError> =>
  asJsExpression(fn).match(
    (expr) => browserWaitForFunction(expr, options).map(toResult),
    (error) => errAsync(error),
  );

/**
 * wait コマンドのハンドラ
 *
 * agent-browserのwaitコマンドと1:1対応:
 * - ms: 指定ミリ秒待機 (wait <ms>)
 * - selector: CSSセレクタで要素出現を待つ (wait <selector>)
 * - text: テキスト出現を待つ (wait --text <text>)
 * - load: ロード状態を待つ (wait --load <state>)
 * - url: URL変化を待つ (wait --url <pattern>)
 * - fn: JS式がtruthyになるのを待つ (wait --fn <expression>)
 *
 * @param command - wait コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleWait = (
  command: WaitCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const toResult = createResultMapper(Date.now());
  const options = context.executeOptions;

  // ミリ秒指定の場合: wait <ms>
  if ('ms' in command) {
    return browserWaitForMs(command.ms, options).map(toResult);
  }

  // セレクタ指定の場合: wait <selector>
  if ('selector' in command) {
    return handleWaitSelector(command.selector, options, toResult);
  }

  // テキスト指定の場合: wait --text <text>
  if ('text' in command) {
    return browserWaitForText(command.text, options).map(toResult);
  }

  // ロード状態指定の場合: wait --load <state>
  if ('load' in command) {
    const loadState: LoadState = command.load;
    return browserWaitForLoad(loadState, options).map(toResult);
  }

  // URL指定の場合: wait --url <pattern>
  if ('url' in command) {
    return browserWaitForUrl(command.url, options).map(toResult);
  }

  // JS式指定の場合: wait --fn <expression>
  return handleWaitFunction(command.fn, options, toResult);
};
