import type { Result } from 'neverthrow';
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
export const handleOpen = async (
  command: OpenCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (await browserOpen(asUrl(command.url), context.executeOptions)).map((output) => {
    const duration = Date.now() - startTime;

    return {
      stdout: JSON.stringify(output),
      duration,
    };
  });
};
