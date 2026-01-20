/**
 * agent-browser CLI出力のバリデーター
 *
 * 外部CLI（agent-browser）からの出力を検証し、型安全なデータに変換する。
 * success: falseの場合はエラーとして扱い、dataのみを返す。
 */

import { type Result, err, ok } from 'neverthrow';
import * as v from 'valibot';
import type { AgentBrowserError } from './types';

/**
 * agent-browserの共通出力構造スキーマ
 *
 * 内部検証用。dataフィールドの型は個別スキーマで指定する。
 */
const createOutputSchema = <T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  dataSchema: T,
) =>
  v.object({
    success: v.boolean(),
    data: v.nullable(dataSchema),
    error: v.nullable(v.string()),
  });

/**
 * stdoutをJSONパースする
 *
 * @param stdout - 標準出力文字列
 * @returns パース成功時: unknown、失敗時: parse_error
 */
const parseJsonOutput = (stdout: string): Result<unknown, AgentBrowserError> => {
  try {
    return ok(JSON.parse(stdout));
  } catch (e) {
    return err({
      type: 'parse_error',
      message: e instanceof Error ? e.message : 'Unknown parse error',
      rawOutput: stdout,
    });
  }
};

/**
 * スキーマ検証を実行する
 *
 * @param parsed - パース済みのオブジェクト
 * @param dataSchema - dataフィールドのスキーマ
 * @param command - コマンド名（エラー情報用）
 * @param rawOutput - 元の出力文字列（エラー情報用）
 * @returns 検証成功時: 検証済みの出力構造、失敗時: agent_browser_output_parse_error
 */
const validateSchema = <T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  parsed: unknown,
  dataSchema: T,
  command: string,
  rawOutput: string,
): Result<v.InferOutput<ReturnType<typeof createOutputSchema<T>>>, AgentBrowserError> => {
  const outputSchema = createOutputSchema(dataSchema);
  const result = v.safeParse(outputSchema, parsed);
  if (!result.success) {
    return err({
      type: 'agent_browser_output_parse_error',
      message: `Schema validation failed for command "${command}"`,
      command,
      issues: result.issues,
      rawOutput,
    });
  }
  return ok(result.output);
};

/**
 * 出力構造からdataを抽出する
 *
 * success: falseまたはdata: nullの場合はエラーを返す
 *
 * @param output - スキーマ検証済みの出力構造
 * @param command - コマンド名（エラー情報用）
 * @returns data抽出成功時: data、失敗時: command_execution_failed
 */
const extractData = <T>(
  output: {
    success: boolean;
    data: T | null;
    error: string | null;
  },
  command: string,
): Result<T, AgentBrowserError> => {
  if (!output.success) {
    return err({
      type: 'command_execution_failed',
      message: output.error || `Command "${command}" failed`,
      command,
      rawError: output.error || 'Unknown error',
    });
  }
  if (output.data === null) {
    return err({
      type: 'command_execution_failed',
      message: `Command "${command}" succeeded but returned no data`,
      command,
      rawError: 'data is null',
    });
  }
  return ok(output.data);
};

/**
 * stdout文字列をJSONパースし、検証し、dataを抽出する
 *
 * 外部境界（agent-browser CLIの出力）からのデータを厳密に検証する。
 * - JSONパースエラー → parse_error
 * - スキーマ検証エラー → agent_browser_output_parse_error
 * - success: false → command_execution_failed
 * - success: true → dataを返す
 *
 * @param stdout - executeCommandからの標準出力
 * @param dataSchema - dataフィールドの検証に使用するvalibotスキーマ
 * @param command - コマンド名（エラー情報用）
 * @returns 成功時: data、失敗時: AgentBrowserError
 */
export const validateAndExtractData = <
  T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  stdout: string,
  dataSchema: T,
  command: string,
): Result<v.InferOutput<T>, AgentBrowserError> => {
  return parseJsonOutput(stdout)
    .andThen((parsed) => validateSchema(parsed, dataSchema, command, stdout))
    .andThen((output) => extractData(output, command));
};
