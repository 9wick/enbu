/**
 * フローローダー
 *
 * ディレクトリから全てのフローファイルを読み込み、
 * パースして環境変数を解決する。
 */

import { Result, ok, err } from 'neverthrow';
import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import type { Flow, ParseError } from '../types';
import { parseFlowYaml } from '../parser/yaml-parser';
import { resolveEnvVariables } from '../parser/env-resolver';

/**
 * ディレクトリから*.flow.yamlファイルを検索する
 *
 * @param dirPath - 検索するディレクトリのパス
 * @returns 成功時: ファイルパスの配列（ソート済み）、失敗時: ParseError
 */
const findFlowFiles = async (dirPath: string): Promise<Result<readonly string[], ParseError>> => {
  try {
    // ディレクトリ内のファイルを取得
    const entries = await readdir(dirPath, { withFileTypes: true });

    // *.flow.yamlにマッチするファイルをフィルター
    const flowFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.flow.yaml'))
      .map((entry) => join(dirPath, entry.name))
      .sort(); // ファイル名順にソート

    return ok(flowFiles);
  } catch (error) {
    return err({
      type: 'file_read_error' as const,
      message: `Failed to read directory: ${dirPath}`,
      filePath: dirPath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * 単一のフローファイルを読み込んでパースする
 *
 * @param filePath - フローファイルのパス
 * @param processEnv - プロセス環境変数
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: Flowオブジェクト、失敗時: ParseError
 */
const loadSingleFlow = async (
  filePath: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): Promise<Result<Flow, ParseError>> => {
  // 1. ファイル読み込み
  let yamlContent: string;
  try {
    yamlContent = await readFile(filePath, 'utf-8');
  } catch (error) {
    return err({
      type: 'file_read_error' as const,
      message: `Failed to read file: ${filePath}`,
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. ファイル名を抽出
  const fileName = basename(filePath);

  // 3. YAMLをパース & 4. 環境変数を解決
  return parseFlowYaml(yamlContent, fileName).andThen((flow) =>
    resolveEnvVariables(flow, processEnv, dotEnv),
  );
};

/**
 * .envファイルを読み込む
 *
 * @param dotEnvPath - .envファイルのパス
 * @returns env変数のマップ（ファイルが存在しない場合は空オブジェクト）
 *
 * @remarks
 * dotenv.configはprocess.envを変更する副作用があるため、
 * dotenv.parseを使用してファイル内容を直接パースする。
 */
const loadDotEnv = async (dotEnvPath: string): Promise<Record<string, string>> => {
  try {
    const content = await readFile(dotEnvPath, 'utf-8');
    return parseDotenv(content);
  } catch {
    // ファイルが存在しない場合は空オブジェクトを返す
    return {};
  }
};

/**
 * 非同期reduceでフローファイルを順次読み込む
 *
 * @param acc - 累積されたResultオブジェクト（Promise）
 * @param filePath - 読み込むフローファイルのパス
 * @param processEnv - プロセス環境変数
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: 更新されたFlow配列、失敗時: ParseError
 */
const reduceLoadFlow = async (
  acc: Promise<Result<Flow[], ParseError>>,
  filePath: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): Promise<Result<Flow[], ParseError>> => {
  const accumulated = await acc;
  return accumulated.match(
    async (flows) => {
      const loadResult = await loadSingleFlow(filePath, processEnv, dotEnv);
      return loadResult.map((flow) => [...flows, flow]);
    },
    (error) => err(error),
  );
};

/**
 * 全てのフローファイルを順次読み込む
 *
 * @param flowFiles - フローファイルのパス配列
 * @param processEnv - プロセス環境変数
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: Flowオブジェクトの配列、失敗時: ParseError
 */
const loadAllFlows = (
  flowFiles: readonly string[],
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): Promise<Result<readonly Flow[], ParseError>> => {
  return flowFiles.reduce<Promise<Result<Flow[], ParseError>>>(
    (acc, filePath) => reduceLoadFlow(acc, filePath, processEnv, dotEnv),
    Promise.resolve(ok([])),
  );
};

/**
 * ディレクトリから全てのフローファイルを読み込む
 *
 * @param dirPath - フローファイルが配置されたディレクトリのパス
 * @param options - オプション
 * @returns 成功時: Flowオブジェクトの配列、失敗時: ParseError
 *
 * @remarks
 * - `*.flow.yaml` パターンにマッチするファイルのみ対象
 * - サブディレクトリは検索しない（シャロー検索）
 * - ファイル名順にソート
 * - 最初のエラーで処理を停止
 *
 * @example
 * const result = await loadFlows('./.abflow', {
 *   processEnv: process.env,
 *   dotEnvPath: './.env'
 * });
 *
 * result.match(
 *   (flows) => {
 *     flows.forEach((flow) => {
 *       console.log(`Loaded flow: ${flow.name}`);
 *     });
 *   },
 *   (error) => console.error(error)
 * );
 */
export const loadFlows = async (
  dirPath: string,
  options?: {
    /** プロセス環境変数（デフォルト: process.env） */
    processEnv?: Readonly<Record<string, string | undefined>>;
    /** .envファイルのパス（デフォルト: .env） */
    dotEnvPath?: string;
  },
): Promise<Result<readonly Flow[], ParseError>> => {
  const processEnv = options?.processEnv ?? process.env;
  const dotEnvPath = options?.dotEnvPath ?? '.env';

  // 1. .envファイルを読み込み
  const dotEnv = await loadDotEnv(dotEnvPath);

  // 2. ディレクトリから*.flow.yamlファイルを検索
  const findResult = await findFlowFiles(dirPath);

  // 3. 全てのフローファイルを読み込み（エラーの場合は即座にエラーResultを返す）
  return findResult.match(
    (files) => loadAllFlows(files, processEnv, dotEnv),
    (error) => Promise.resolve(err(error)),
  );
};
