/**
 * キャプチャ系コマンド
 *
 * ブラウザの画面キャプチャに関するコマンドを提供する。
 */

import { type ResultAsync } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, FilePath, ScreenshotOptions } from '../types';
import type { ScreenshotData, SnapshotData, PdfData } from '../schemas';
import { ScreenshotDataSchema, SnapshotDataSchema, PdfDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * ページのスクリーンショットを撮影する
 *
 * @param path - 保存先のファイルパス
 * @param options - 実行オプション（fullPageオプション含む）
 * @returns 成功時: ScreenshotData、失敗時: AgentBrowserError
 */
export const browserScreenshot = (
  path: FilePath,
  options: ScreenshotOptions = {},
): ResultAsync<ScreenshotData, AgentBrowserError> => {
  const { fullPage, ...executeOptions } = options;
  const args = fullPage ? [path, '--full', '--json'] : [path, '--json'];

  return executeCommand('screenshot', args, executeOptions).andThen((stdout) =>
    validateAndExtractData(stdout, ScreenshotDataSchema, 'screenshot'),
  );
};

/**
 * ページの構造をスナップショットとして取得する
 *
 * @param options - 実行オプション
 * @returns 成功時: SnapshotData、失敗時: AgentBrowserError
 */
export const browserSnapshot = (
  options: ExecuteOptions = {},
): ResultAsync<SnapshotData, AgentBrowserError> =>
  executeCommand('snapshot', ['--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, SnapshotDataSchema, 'snapshot'),
  );

/**
 * ページをPDFとして保存する
 *
 * @param path - 保存先のファイルパス
 * @param options - 実行オプション
 * @returns 成功時: PdfData、失敗時: AgentBrowserError
 */
export const browserPdf = (
  path: FilePath,
  options: ExecuteOptions = {},
): ResultAsync<PdfData, AgentBrowserError> => {
  const args = [path, '--json'];

  return executeCommand('pdf', args, options).andThen((stdout) =>
    validateAndExtractData(stdout, PdfDataSchema, 'pdf'),
  );
};
