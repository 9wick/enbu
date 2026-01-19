/**
 * キャプチャ系コマンド
 *
 * ブラウザの画面キャプチャに関するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, FilePath, ScreenshotOptions } from '../types';
import type { ScreenshotData, SnapshotData } from '../schemas';
import { ScreenshotDataSchema, SnapshotDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * ページのスクリーンショットを撮影する
 *
 * @param path - 保存先のファイルパス
 * @param options - 実行オプション（fullPageオプション含む）
 * @returns 成功時: ScreenshotData、失敗時: AgentBrowserError
 */
export const browserScreenshot = async (
  path: FilePath,
  options: ScreenshotOptions = {},
): Promise<Result<ScreenshotData, AgentBrowserError>> => {
  const { fullPage, ...executeOptions } = options;
  const args = fullPage ? [path, '--full', '--json'] : [path, '--json'];

  return (await executeCommand('screenshot', args, executeOptions)).andThen((stdout) =>
    validateAndExtractData(stdout, ScreenshotDataSchema, 'screenshot'),
  );
};

/**
 * ページの構造をスナップショットとして取得する
 *
 * @param options - 実行オプション
 * @returns 成功時: SnapshotData、失敗時: AgentBrowserError
 */
export const browserSnapshot = async (
  options: ExecuteOptions = {},
): Promise<Result<SnapshotData, AgentBrowserError>> => {
  return (await executeCommand('snapshot', ['--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, SnapshotDataSchema, 'snapshot'),
  );
};
