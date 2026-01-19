/**
 * agent-browser CLI出力のバリデーター
 *
 * 外部CLI（agent-browser）からの出力を検証し、型安全なデータに変換する。
 */

import { type Result, err, ok } from 'neverthrow';
import * as v from 'valibot';
import type { AgentBrowserError } from './types';

/**
 * stdout文字列をJSONパースし、valibotスキーマで検証する
 *
 * 外部境界（agent-browser CLIの出力）からのデータを厳密に検証する。
 * パースエラーまたはスキーマ検証エラーの場合は適切なエラーを返す。
 *
 * @param stdout - executeCommandからの標準出力
 * @param schema - 検証に使用するvalibotスキーマ
 * @param command - コマンド名（エラー情報用）
 * @returns 成功時: 検証済みデータ、失敗時: AgentBrowserError
 */
export const validateOutput = <T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  stdout: string,
  schema: T,
  command: string,
): Result<v.InferOutput<T>, AgentBrowserError> => {
  // 1. JSONパース
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (e) {
    return err({
      type: 'parse_error',
      message: e instanceof Error ? e.message : 'Unknown parse error',
      rawOutput: stdout,
    });
  }

  // 2. valibotスキーマ検証
  const result = v.safeParse(schema, parsed);

  if (!result.success) {
    return err({
      type: 'agent_browser_output_parse_error',
      message: `Schema validation failed for command "${command}"`,
      command,
      issues: result.issues,
      rawOutput: stdout,
    });
  }

  return ok(result.output);
};
