import type { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
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

  // ミリ秒指定の場合: wait <ms>
  if ('ms' in command) {
    return (await executeCommand('wait', [command.ms.toString(), '--json'], context.executeOptions))
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // セレクタ指定の場合: wait <selector>
  if ('selector' in command) {
    return (await executeCommand('wait', [command.selector, '--json'], context.executeOptions))
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // テキスト指定の場合: wait --text <text>
  if ('text' in command) {
    return (
      await executeCommand('wait', ['--text', command.text, '--json'], context.executeOptions)
    )
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // ロード状態指定の場合: wait --load <state>
  if ('load' in command) {
    return (
      await executeCommand('wait', ['--load', command.load, '--json'], context.executeOptions)
    )
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // URL指定の場合: wait --url <pattern>
  if ('url' in command) {
    return (await executeCommand('wait', ['--url', command.url, '--json'], context.executeOptions))
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // JS式指定の場合: wait --fn <expression>
  return (await executeCommand('wait', ['--fn', command.fn, '--json'], context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
