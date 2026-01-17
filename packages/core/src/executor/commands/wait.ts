import type { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { WaitCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * wait コマンドのハンドラ
 *
 * WaitCommandは { ms: number } または { target: string } の2つの形式をサポートする。
 * - ms: 指定されたミリ秒間待機する
 * - target: 指定されたセレクタの要素が表示されるまで待機する
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

  // ミリ秒指定の場合
  if ('ms' in command) {
    return (await executeCommand('wait', [command.ms.toString(), '--json'], context.executeOptions))
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // セレクタ指定の場合
  return (await executeCommand('wait', [command.target, '--json'], context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
