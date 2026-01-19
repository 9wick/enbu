import { err } from 'neverthrow';
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

  // URL検証
  const urlResult = asUrl(command.url);
  if (urlResult.isErr()) {
    return err(urlResult.error);
  }

  // ブラウザ操作実行
  return (await browserOpen(urlResult.value, context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
