import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { type ResultAsync, fromPromise } from 'neverthrow';
import type { CliError } from '../types';

/**
 * ファイルが存在するか確認
 *
 * 指定されたパスにファイルまたはディレクトリが存在するかを確認する。
 * アクセス権限がない場合もfalseを返す。
 *
 * @param path - 確認対象のファイルまたはディレクトリのパス
 * @returns ファイルが存在する場合はtrue、存在しない場合またはアクセスできない場合はfalse
 */
export const fileExists = (path: string): Promise<boolean> => {
  return access(path, constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

/**
 * ディレクトリを作成（存在しない場合のみ）
 *
 * 指定されたパスにディレクトリを作成する。
 * recursive オプションにより、親ディレクトリが存在しない場合も自動的に作成される。
 * 既にディレクトリが存在する場合はエラーにならず、成功として扱われる。
 *
 * @param path - 作成するディレクトリのパス
 * @returns 成功時: void、失敗時: CliError（type: 'execution_error'）
 */
export const createDirectory = (path: string): ResultAsync<void, CliError> => {
  return fromPromise(
    mkdir(path, { recursive: true }),
    (error): CliError => ({
      type: 'execution_error',
      message: `Failed to create directory: ${path}`,
      cause: error,
    }),
  ).map(() => undefined);
};

/**
 * ファイルを書き込み
 *
 * 指定されたパスにテキストファイルを書き込む。
 * ファイルが既に存在する場合は上書きされる。
 * 親ディレクトリが存在しない場合はエラーとなるため、事前に createDirectory を実行すること。
 *
 * @param path - 書き込み先のファイルパス
 * @param content - 書き込むテキスト内容
 * @returns 成功時: void、失敗時: CliError（type: 'execution_error'）
 */
export const writeFileContent = (path: string, content: string): ResultAsync<void, CliError> => {
  return fromPromise(
    writeFile(path, content, 'utf-8'),
    (error): CliError => ({
      type: 'execution_error',
      message: `Failed to write file: ${path}`,
      cause: error,
    }),
  ).map(() => undefined);
};

/**
 * ファイルを読み込み
 *
 * 指定されたパスからテキストファイルを読み込む。
 * ファイルが存在しない場合やアクセス権限がない場合はエラーを返す。
 * バイナリファイルの読み込みには対応していないため、UTF-8テキストファイルのみを対象とする。
 *
 * @param path - 読み込むファイルのパス
 * @returns 成功時: ファイルの内容（文字列）、失敗時: CliError（type: 'execution_error'）
 */
export const readFileContent = (path: string): ResultAsync<string, CliError> => {
  return fromPromise(
    readFile(path, 'utf-8'),
    (error): CliError => ({
      type: 'execution_error',
      message: `Failed to read file: ${path}`,
      cause: error,
    }),
  );
};
