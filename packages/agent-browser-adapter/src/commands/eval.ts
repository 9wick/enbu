/**
 * JavaScript実行コマンド
 *
 * ブラウザコンテキストでJavaScriptを実行するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, JsExpression } from '../types';
import type { EvalOutput } from '../schemas';
import { EvalOutputSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateOutput } from '../validator';

/**
 * ブラウザコンテキストでJavaScriptを実行する
 *
 * @param script - 実行するスクリプト
 * @param options - 実行オプション
 * @returns 成功時: EvalOutput、失敗時: AgentBrowserError
 */
export const browserEval = async (
  script: JsExpression,
  options: ExecuteOptions = {},
): Promise<Result<EvalOutput, AgentBrowserError>> => {
  return (await executeCommand('eval', [script, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, EvalOutputSchema, 'eval'),
  );
};
