import { type Result, err, fromThrowable, ok } from 'neverthrow';
import type { AgentBrowserError, AgentBrowserJsonOutput, SnapshotRefs } from './types';

/**
 * オブジェクトかどうかを判定する型ガード
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * parse_error型のエラーかどうかを判定する型ガード
 */
const isParseError = (
  e: AgentBrowserError,
): e is { type: 'parse_error'; message: string; rawOutput: string } => {
  return e.type === 'parse_error';
};

/**
 * JSON.parseをResult型でラップ
 * JSON.parseの戻り値はunknown型として扱う
 */
const safeJsonParse = fromThrowable(
  (text: string): unknown => JSON.parse(text),
  (error): AgentBrowserError => ({
    type: 'parse_error' as const,
    message: error instanceof Error ? error.message : 'Unknown parse error',
    rawOutput: '',
  }),
);

/**
 * AgentBrowserJsonOutputの型ガード
 */
const isAgentBrowserJsonOutput = (value: unknown): value is AgentBrowserJsonOutput => {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.success === 'boolean' && 'data' in value && 'error' in value;
};

/**
 * agent-browserの--json出力をパースする
 *
 * @param rawOutput - executeCommandの戻り値（stdout文字列）
 * @returns 成功時: パース済みオブジェクト（dataはunknown型）、失敗時: AgentBrowserError
 */
export const parseJsonOutput = (
  rawOutput: string,
): Result<AgentBrowserJsonOutput<unknown>, AgentBrowserError> => {
  return safeJsonParse(rawOutput)
    .mapErr((e): AgentBrowserError => {
      const message = isParseError(e) ? e.message : 'Unknown parse error';
      return {
        type: 'parse_error' as const,
        message,
        rawOutput,
      };
    })
    .andThen((parsed) => {
      // 構造の検証
      if (!isAgentBrowserJsonOutput(parsed)) {
        return err({
          type: 'parse_error' as const,
          message: 'Invalid JSON structure: missing success, data, or error fields',
          rawOutput,
        });
      }
      // 型ガードにより parsed は AgentBrowserJsonOutput<unknown> 型
      return ok(parsed);
    });
};

/**
 * snapshot --json 出力から参照マップを抽出する
 *
 * @param jsonOutput - parseJsonOutputの戻り値
 * @returns 成功時: SnapshotRefs、失敗時: AgentBrowserError
 */
export const parseSnapshotRefs = (
  jsonOutput: AgentBrowserJsonOutput<unknown>,
): Result<SnapshotRefs, AgentBrowserError> => {
  if (!jsonOutput.success) {
    return err({
      type: 'parse_error' as const,
      message: `Snapshot failed: ${jsonOutput.error}`,
      rawOutput: JSON.stringify(jsonOutput),
    });
  }

  const data = jsonOutput.data;

  if (!isRecord(data)) {
    return err({
      type: 'parse_error' as const,
      message: 'Invalid snapshot output: data is not an object',
      rawOutput: JSON.stringify(jsonOutput),
    });
  }

  if (!isRecord(data.refs)) {
    return err({
      type: 'parse_error' as const,
      message: 'Invalid snapshot output: missing refs field',
      rawOutput: JSON.stringify(jsonOutput),
    });
  }

  // refs の各エントリを検証
  const refs = data.refs;
  const validatedRefs: SnapshotRefs = {};

  for (const [key, value] of Object.entries(refs)) {
    if (!isSnapshotRef(value)) {
      return err({
        type: 'parse_error' as const,
        message: `Invalid ref entry "${key}": missing name or role`,
        rawOutput: JSON.stringify(jsonOutput),
      });
    }
    validatedRefs[key] = value;
  }

  return ok(validatedRefs);
};

/**
 * SnapshotRefの型ガード
 */
const isSnapshotRef = (value: unknown): value is { name: string; role: string } => {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.name === 'string' && typeof value.role === 'string';
};
