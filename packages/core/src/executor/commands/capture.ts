import type { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { ScreenshotCommand, SnapshotCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * screenshot コマンドのハンドラ
 *
 * ページのスクリーンショットを撮影し、指定されたパスに保存する。
 * fullオプションがtrueの場合、ページ全体のスクリーンショットを撮影する。
 *
 * @param command - screenshot コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScreenshot = async (
  command: ScreenshotCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  const args = [command.path];
  if (command.full) {
    args.push('--full');
  }
  args.push('--json');

  return (await executeCommand('screenshot', args, context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * snapshot コマンドのハンドラ
 *
 * ページの構造をスナップショットとして取得する。
 * agent-browser の snapshot コマンドを実行し、ページの要素構造を返す。
 *
 * @param command - snapshot コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleSnapshot = async (
  command: SnapshotCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (await executeCommand('snapshot', ['--json'], context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
