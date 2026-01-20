import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { browserEval } from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { EvalCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';

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
export const handleEval = (
  command: EvalCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // command.script は既に JsExpression 型（Branded Type）なので、そのまま使用
  return browserEval(command.script, context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
