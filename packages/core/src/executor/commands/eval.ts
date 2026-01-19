import type { Result } from 'neverthrow';
import { err } from 'neverthrow';
import { browserEval, asJsExpression } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { EvalCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * eval コマンドのハンドラ
 *
 * ブラウザコンテキストでJavaScriptを実行し、その結果を返す。
 * agent-browser の eval コマンドを実行する。
 *
 * @param command - eval コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleEval = async (
  command: EvalCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // JavaScript式検証
  const scriptResult = asJsExpression(command.script);
  if (scriptResult.isErr()) {
    return err(scriptResult.error);
  }

  // ブラウザ操作実行
  return (await browserEval(scriptResult.value, context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
