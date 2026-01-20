/**
 * 環境変数リゾルバー
 *
 * フロー内の環境変数参照（${VAR}形式）を解決し、
 * 実際の値に展開する。
 */

import { err, ok, type Result } from 'neverthrow';
import type { FlowEnv, ParseError } from '../types';

/**
 * Raw Flow Data型
 *
 * 環境変数解決処理に使用する、生のフローデータ。
 * Command型のバリデーション前の状態を表す。
 */
export type RawFlowData = {
  /** 環境変数マップ */
  env: FlowEnv;
  /** ステップ配列（未検証） */
  steps: unknown[];
};

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
 * オブジェクトの全てのプロパティを走査して環境変数を解決する
 *
 * 再帰的に処理（ネストされたオブジェクトに対応）
 * mutableな操作を行うが、structuredCloneされたオブジェクトに対して行うため安全
 *
 * @param obj - 解決対象のオブジェクト
 * @param envMap - 環境変数マップ
 * @param location - エラー報告用のロケーション
 * @returns 成功時: void、失敗時: ParseError
 */
const resolveObjectVariables = (
  obj: Record<string, unknown>,
  envMap: Record<string, string>,
  location: string,
): Result<void, ParseError> => {
  const entries = Object.entries(obj);

  /**
   * 単一のエントリを処理する
   */
  const processEntry = ([key, value]: [string, unknown]): Result<void, ParseError> => {
    if (typeof value === 'string') {
      // 文字列プロパティの環境変数を解決し、objを変更
      return resolveStringVariables(value, envMap, `${location}.${key}`).map((resolved) => {
        obj[key] = resolved;
      });
    }
    if (isRecord(value)) {
      // ネストされたオブジェクトを再帰的に処理
      return resolveObjectVariables(value, envMap, `${location}.${key}`);
    }
    // その他の型（number, boolean, null等）はそのまま
    return ok(undefined);
  };

  return entries.reduce<Result<void, ParseError>>(
    (acc, entry) => acc.andThen(() => processEntry(entry)),
    ok(undefined),
  );
};

/**
 * ステップ内の環境変数を解決する
 *
 * 生のステップデータをディープクローンし、クローン先で環境変数を展開する。
 * まだCommand型にはなっていないため、Symbolを含まない。
 *
 * @param step - 解決対象のステップ（未検証）
 * @param envMap - 環境変数マップ
 * @param stepIndex - ステップのインデックス（エラー報告用）
 * @returns 成功時: 新しいステップオブジェクト、失敗時: ParseError
 */
const resolveStepVariables = (
  step: unknown,
  envMap: Record<string, string>,
  stepIndex: number,
): Result<unknown, ParseError> => {
  // ステップをディープクローン（structuredCloneを使用、Symbolは存在しないため安全）
  const cloned = structuredClone(step);

  // オブジェクトでない場合はそのまま返す
  if (!isRecord(cloned)) {
    return ok(cloned);
  }

  // 全てのプロパティを走査して文字列を解決
  const location = `step[${stepIndex}]`;

  // clonedに対して環境変数を解決
  return resolveObjectVariables(cloned, envMap, location).map(() => cloned);
};

/**
 * 生のフローデータ内の環境変数参照を解決する
 *
 * @param rawFlow - パース済みの生フローデータ（Command型検証前）
 * @param processEnv - プロセス環境変数（process.env）
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: 環境変数が展開された生フローデータ、失敗時: ParseError
 *
 * @remarks
 * 環境変数の優先順位:
 * 1. processEnv（最優先）
 * 2. dotEnv
 * 3. rawFlow.env（最後の選択肢）
 *
 * 注意: この関数はCommand型の検証前に呼び出される。
 * そのため、stepsはまだunknown[]であり、Symbolを含まない。
 *
 * @example
 * const rawFlow: RawFlowData = {
 *   env: { BASE_URL: 'https://example.com' },
 *   steps: [
 *     { open: '${BASE_URL}' },
 *     { fill: { selector: 'password', value: '${PASSWORD}' } }
 *   ]
 * };
 *
 * const result = resolveEnvVariables(
 *   rawFlow,
 *   process.env,
 *   { PASSWORD: 'secret' }
 * );
 */
export const resolveEnvVariables = (
  rawFlow: RawFlowData,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): Result<RawFlowData, ParseError> => {
  // 1. 環境変数マップを統合（優先順位: processEnv > dotEnv > rawFlow.env）
  const envMap = mergeEnvMaps(processEnv, dotEnv, rawFlow.env);

  // 2. 全てのステップを走査して環境変数を解決
  return rawFlow.steps
    .reduce<Result<unknown[], ParseError>>(
      (acc, step, index) =>
        acc.andThen((steps) =>
          resolveStepVariables(step, envMap, index).map((resolved) => [...steps, resolved]),
        ),
      ok([]),
    )
    .map((resolvedSteps) => ({
      ...rawFlow,
      steps: resolvedSteps,
    }));
};
