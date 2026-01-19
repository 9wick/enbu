import type { Result } from 'neverthrow';
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
import type { AgentBrowserError, LoadState } from '@packages/agent-browser-adapter';
import type { WaitCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

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
export const handleWait = async (
  command: WaitCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  const toResult = <T>(
    result: Result<T, AgentBrowserError>,
  ): Result<CommandResult, AgentBrowserError> =>
    result.map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));

  // ミリ秒指定の場合: wait <ms>
  if ('ms' in command) {
    return toResult(await browserWaitForMs(command.ms, context.executeOptions));
  }

  // セレクタ指定の場合: wait <selector>
  if ('selector' in command) {
    return toResult(
      await browserWaitForSelector(asSelector(command.selector), context.executeOptions),
    );
  }

  // テキスト指定の場合: wait --text <text>
  if ('text' in command) {
    return toResult(await browserWaitForText(command.text, context.executeOptions));
  }

  // ロード状態指定の場合: wait --load <state>
  if ('load' in command) {
    const loadState: LoadState = command.load;
    return toResult(await browserWaitForLoad(loadState, context.executeOptions));
  }

  // URL指定の場合: wait --url <pattern>
  if ('url' in command) {
    return toResult(await browserWaitForUrl(command.url, context.executeOptions));
  }

  // JS式指定の場合: wait --fn <expression>
  return toResult(await browserWaitForFunction(asJsExpression(command.fn), context.executeOptions));
};
