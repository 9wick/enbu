/**
 * JavaScript実行コマンド
 *
 * ブラウザコンテキストでJavaScriptを実行するコマンドを提供する。
 */

import { type ResultAsync } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, JsExpression } from '../types';
import type { EvalData } from '../schemas';
import { EvalDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * ブラウザコンテキストでJavaScriptを実行する
 *
 * @param script - 実行するスクリプト
 * @param options - 実行オプション
 * @returns 成功時: EvalData、失敗時: AgentBrowserError
 */
export const browserEval = (
  script: JsExpression,
  options: ExecuteOptions = {},
): ResultAsync<EvalData, AgentBrowserError> =>
  executeCommand('eval', [script, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EvalDataSchema, 'eval'),
  );
