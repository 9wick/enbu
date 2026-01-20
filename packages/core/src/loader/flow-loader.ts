/**
 * フローローダー
 *
 * ディレクトリから全てのフローファイルを読み込み、
 * パースして環境変数を解決する。
 */

import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { match } from 'ts-pattern';
import { parseFlowYaml } from '../parser/yaml-parser';
import type { Flow, ParseError } from '../types';

/**
 * ENOENT エラーかどうかを判定する
 *
 * ts-pattern で構造的にマッチングし、型安全にエラーを判定する。
 *
 * @param error - 判定対象のエラー
 * @returns ENOENT の場合 true
 */
const isEnoentError = (error: unknown): boolean =>
  match(error)
    .with({ code: 'ENOENT' }, () => true)
    .otherwise(() => false);

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
 * YAMLをパースする（環境変数解決を含む）
 *
 * @remarks
 * parseFlowYaml内部で環境変数解決が行われる。
 * 処理順序:
 * 1. YAMLパース
 * 2. 環境変数解決（文字列レベル）
 * 3. Command型検証
 */
const parseYaml = (
  yamlContent: string,
  fileName: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
): ResultAsync<Flow, ParseError> =>
  parseFlowYaml(yamlContent, fileName, processEnv, dotEnv).match(
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
  ).andThen((yamlContent) => parseYaml(yamlContent, fileName, processEnv, dotEnv));
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
      if (isEnoentError(error)) {
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
