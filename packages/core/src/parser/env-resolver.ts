/**
 * 環境変数リゾルバー
 *
 * フロー内の環境変数参照（${VAR}形式）を解決し、
 * 実際の値に展開する。
 */

import { type Result, err, ok } from 'neverthrow';
import type { Command, Flow, ParseError } from '../types';

/**
 * 環境変数マップを統合する
 *
 * 優先順位: processEnv > dotEnv > flowEnv
 * 純粋関数として実装。
 */
const mergeEnvMaps = (
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
  flowEnv: Readonly<Record<string, string>>,
): Record<string, string> => {
  const merged: Record<string, string> = {};

  // 優先順位の低い順に追加
  Object.assign(merged, flowEnv);
  Object.assign(merged, dotEnv);

  // processEnvは未定義の値を除外
  for (const [key, value] of Object.entries(processEnv)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
};

/**
 * 文字列内の環境変数参照を解決する
 *
 * ${VAR} 形式の全ての参照を置換。
 * 未定義の変数はエラーとして扱う。
 */
const resolveStringVariables = (
  text: string,
  envMap: Record<string, string>,
  location: string,
): Result<string, ParseError> => {
  // ${VAR} パターンを検出（大文字小文字、アンダースコア、数字を許容）
  const variablePattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

  // 全てのマッチを取得
  const matches = [...text.matchAll(variablePattern)];

  // マッチがない場合はそのまま返す
  if (matches.length === 0) {
    return ok(text);
  }

  let resolved = text;

  for (const match of matches) {
    const fullMatch = match[0]; // ${VAR}
    const varName = match[1]; // VAR

    // 環境変数マップから値を取得
    const value = envMap[varName];

    if (value === undefined) {
      return err({
        type: 'undefined_variable',
        message: `Variable "${varName}" is not defined`,
        variableName: varName,
        location,
      });
    }

    // 置換（同じ変数が複数回出現する場合も全て置換）
    resolved = resolved.split(fullMatch).join(value);
  }

  return ok(resolved);
};

/**
 * 値がRecord型かどうかを判定する型ガード
 *
 * @param value - 判定対象の値
 * @returns Record型の場合true
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * 文字列プロパティの環境変数を解決する
 *
 * @param obj - 解決対象のオブジェクト
 * @param key - プロパティキー
 * @param value - プロパティ値
 * @param envMap - 環境変数マップ
 * @param location - エラー報告用のロケーション
 * @returns 成功時: void、失敗時: ParseError
 */
const resolveStringProperty = (
  obj: Record<string, unknown>,
  key: string,
  value: string,
  envMap: Record<string, string>,
  location: string,
): Result<void, ParseError> => {
  return resolveStringVariables(value, envMap, `${location}.${key}`).map((resolved) => {
    obj[key] = resolved;
  });
};

/**
 * ネストされたオブジェクトプロパティを再帰的に解決する
 *
 * @param value - ネストされたオブジェクト
 * @param envMap - 環境変数マップ
 * @param location - エラー報告用のロケーション
 * @returns 成功時: void、失敗時: ParseError
 */
const resolveNestedObject = (
  value: Record<string, unknown>,
  envMap: Record<string, string>,
  location: string,
): Result<void, ParseError> => {
  return resolveObjectVariables(value, envMap, location);
};

/**
 * オブジェクトの全てのプロパティを走査して環境変数を解決する
 *
 * 再帰的に処理（ネストされたオブジェクトに対応）
 * mutableな操作を行うが、クローンされたオブジェクトに対して行う
 */
const resolveObjectVariables = (
  obj: Record<string, unknown>,
  envMap: Record<string, string>,
  location: string,
): Result<void, ParseError> => {
  const entries = Object.entries(obj);

  const processEntry = ([key, value]: [string, unknown]): Result<void, ParseError> => {
    if (typeof value === 'string') {
      // 文字列プロパティの環境変数を解決
      return resolveStringProperty(obj, key, value, envMap, location);
    }
    if (isRecord(value)) {
      // ネストされたオブジェクトを再帰的に処理
      return resolveNestedObject(value, envMap, `${location}.${key}`);
    }
    return ok(undefined);
  };

  return entries.reduce<Result<void, ParseError>>(
    (acc, entry) => acc.andThen(() => processEntry(entry)),
    ok(undefined),
  );
};

/**
 * コマンド内の環境変数を解決する
 *
 * コマンドをディープクローンし、全てのプロパティの環境変数を解決する。
 */
const resolveCommandVariables = (
  command: Command,
  envMap: Record<string, string>,
  commandIndex: number,
): Result<Command, ParseError> => {
  // コマンドをディープクローン
  // NOTE: structuredCloneはanyを返すため、型注釈で元の型を保持
  const cloned: Command = structuredClone(command);

  // CommandをRecord<string, unknown>として扱う必要があるため型注釈で変換
  const clonedRecord: Record<string, unknown> = cloned;

  // 全てのプロパティを走査して文字列を解決
  const location = `step[${commandIndex}]`;

  // clonedはCommand型として保持されているため、そのまま返す
  return resolveObjectVariables(clonedRecord, envMap, location).map(() => cloned);
};

/**
 * フロー内の環境変数参照を解決する
 *
 * @param flow - パース済みのFlowオブジェクト
 * @param processEnv - プロセス環境変数（process.env）
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: 環境変数が展開されたFlow、失敗時: ParseError
 *
 * @remarks
 * 環境変数の優先順位:
 * 1. processEnv（最優先）
 * 2. dotEnv
 * 3. flow.env（最後の選択肢）
 *
 * @example
 * const flow: Flow = {
 *   name: 'login',
 *   env: { BASE_URL: 'https://example.com' },
 *   steps: [
 *     { command: 'open', url: '${BASE_URL}' },
 *     { command: 'fill', selector: 'password', value: '${PASSWORD}' }
 *   ]
 * };
 *
 * const result = resolveEnvVariables(
 *   flow,
 *   process.env,
 *   { PASSWORD: 'secret' }
 * );
 */
export const resolveEnvVariables = (
  flow: Flow,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): Result<Flow, ParseError> => {
  // 1. 環境変数マップを統合（優先順位: processEnv > dotEnv > flow.env）
  const envMap = mergeEnvMaps(processEnv, dotEnv, flow.env);

  // 2. 全てのコマンドを走査して環境変数を解決
  return flow.steps
    .reduce<Result<Command[], ParseError>>(
      (acc, command, index) =>
        acc.andThen((commands) =>
          resolveCommandVariables(command, envMap, index).map((resolved) => [
            ...commands,
            resolved,
          ]),
        ),
      ok([]),
    )
    .map((resolvedCommands) => ({
      ...flow,
      steps: resolvedCommands,
    }));
};
