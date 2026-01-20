import { type ResultAsync, errAsync } from 'neverthrow';
import { browserOpen, asUrl } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { OpenCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

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

  return asUrl(command.url).match(
    (url) =>
      browserOpen(url, context.executeOptions).map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      })),
    (error) => errAsync(error),
  );
};
