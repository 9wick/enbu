/**
 * フローローダー
 *
 * ディレクトリから全てのフローファイルを読み込み、
 * パースして環境変数を解決する。
 */

import { ResultAsync, okAsync, errAsync } from 'neverthrow';
import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import type { Flow, ParseError } from '../types';
import { parseFlowYaml } from '../parser/yaml-parser';
import { resolveEnvVariables } from '../parser/env-resolver';

/**
 * ディレクトリから*.enbu.yamlファイルを検索する
 *
 * @param dirPath - 検索するディレクトリのパス
 * @returns 成功時: ファイルパスの配列（ソート済み）、失敗時: ParseError
 */
const findFlowFiles = (dirPath: string): ResultAsync<readonly string[], ParseError> =>
  ResultAsync.fromPromise(
    readdir(dirPath, { withFileTypes: true }).then((entries) =>
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.enbu.yaml'))
        .map((entry) => join(dirPath, entry.name))
        .sort(),
    ),
    (error): ParseError => ({
      type: 'file_read_error' as const,
      message: `Failed to read directory: ${dirPath}`,
      filePath: dirPath,
      cause: error instanceof Error ? error.message : String(error),
    }),
  );

/**
 * YAMLをパースして環境変数を解決する
 */
const parseAndResolveEnv = (
  yamlContent: string,
  fileName: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): ResultAsync<Flow, ParseError> =>
  parseFlowYaml(yamlContent, fileName)
    .andThen((flow) => resolveEnvVariables(flow, processEnv, dotEnv))
    .match(
      (flow) => okAsync(flow),
      (error) => errAsync(error),
    );

/**
 * 単一のフローファイルを読み込んでパースする
 *
 * @param filePath - フローファイルのパス
 * @param processEnv - プロセス環境変数
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: Flowオブジェクト、失敗時: ParseError
 */
const loadSingleFlow = (
  filePath: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): ResultAsync<Flow, ParseError> => {
  const fileName = basename(filePath);

  return ResultAsync.fromPromise(
    readFile(filePath, 'utf-8'),
    (error): ParseError => ({
      type: 'file_read_error' as const,
      message: `Failed to read file: ${filePath}`,
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    }),
  ).andThen((yamlContent) => parseAndResolveEnv(yamlContent, fileName, processEnv, dotEnv));
};

/**
 * .envファイルを読み込む
 *
 * @param dotEnvPath - .envファイルのパス
 * @returns 成功時: env変数のマップ（ファイルが存在しない場合は空オブジェクト）、失敗時: ParseError
 *
 * @remarks
 * dotenv.configはprocess.envを変更する副作用があるため、
 * dotenv.parseを使用してファイル内容を直接パースする。
 *
 * エラーハンドリング:
 * - ENOENT（ファイルが存在しない）: 空オブジェクトを返す（正常系）
 * - その他のエラー（EACCES、EIOなど）: エラーを伝播させる
 */
const loadDotEnv = (dotEnvPath: string): ResultAsync<Record<string, string>, ParseError> =>
  ResultAsync.fromPromise(
    readFile(dotEnvPath, 'utf-8').then((content) => parseDotenv(content)),
    (error): ParseError | undefined => {
      // ENOENT（ファイルが存在しない）の場合は空オブジェクトを返す
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return undefined; // これによりorElseで処理される
      }

      // その他のエラー（パーミッションエラー、I/Oエラーなど）は伝播
      return {
        type: 'file_read_error' as const,
        message: `Failed to read .env file: ${dotEnvPath}`,
        filePath: dotEnvPath,
        cause: error instanceof Error ? error.message : String(error),
      };
    },
  ).orElse((error) => (error === undefined ? okAsync({}) : errAsync(error)));

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
): ResultAsync<readonly Flow[], ParseError> => {
  // 各ファイルをResultAsyncに変換
  const loadResults = flowFiles.map((filePath) => loadSingleFlow(filePath, processEnv, dotEnv));

  // ResultAsync.combineで全てを結合（最初のエラーで停止）
  return ResultAsync.combine(loadResults);
};

/**
 * フローファイルを検索して読み込む
 */
const findAndLoadFlows = (
  dirPath: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): ResultAsync<readonly Flow[], ParseError> =>
  findFlowFiles(dirPath).andThen((files) => loadAllFlows(files, processEnv, dotEnv));

/**
 * ディレクトリから全てのフローファイルを読み込む
 *
 * @param dirPath - フローファイルが配置されたディレクトリのパス
 * @param options - オプション
 * @returns 成功時: Flowオブジェクトの配列、失敗時: ParseError
 *
 * @remarks
 * - `*.enbu.yaml` パターンにマッチするファイルのみ対象
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
export const loadFlows = (
  dirPath: string,
  options?: {
    /** プロセス環境変数（デフォルト: process.env） */
    processEnv?: Readonly<Record<string, string | undefined>>;
    /** .envファイルのパス（デフォルト: .env） */
    dotEnvPath?: string;
  },
): ResultAsync<readonly Flow[], ParseError> => {
  const processEnv = options?.processEnv ?? process.env;
  const dotEnvPath = options?.dotEnvPath ?? '.env';

  return loadDotEnv(dotEnvPath).andThen((dotEnv) => findAndLoadFlows(dirPath, processEnv, dotEnv));
};
