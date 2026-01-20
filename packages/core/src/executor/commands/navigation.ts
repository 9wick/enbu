import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { browserOpen } from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { OpenCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';

/**
 * open コマンドのハンドラ
 *
 * 指定されたURLをブラウザで開く。
 * agent-browser の open コマンドを実行し、その結果をパースして返す。
 *
 * @param command - open コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleOpen = (
  command: OpenCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // command.url は既に Url 型（Branded Type）なので、そのまま使用
  return browserOpen(command.url, context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
