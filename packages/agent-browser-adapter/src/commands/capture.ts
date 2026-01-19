/**
 * キャプチャ系コマンド
 *
 * ブラウザの画面キャプチャに関するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, FilePath, ScreenshotOptions } from '../types';
import type { ScreenshotOutput, SnapshotOutput } from '../schemas';
import { ScreenshotOutputSchema, SnapshotOutputSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateOutput } from '../validator';

/**
 * ページのスクリーンショットを撮影する
 *
 * @param path - 保存先のファイルパス
 * @param options - 実行オプション（fullPageオプション含む）
 * @returns 成功時: ScreenshotOutput、失敗時: AgentBrowserError
 */
export const browserScreenshot = async (
  path: FilePath,
  options: ScreenshotOptions = {},
): Promise<Result<ScreenshotOutput, AgentBrowserError>> => {
  const { fullPage, ...executeOptions } = options;
  const args = fullPage ? [path, '--full', '--json'] : [path, '--json'];

  return (await executeCommand('screenshot', args, executeOptions)).andThen((stdout) =>
    validateOutput(stdout, ScreenshotOutputSchema, 'screenshot'),
  );
};

/**
 * ページの構造をスナップショットとして取得する
 *
 * @param options - 実行オプション
 * @returns 成功時: SnapshotOutput、失敗時: AgentBrowserError
 */
export const browserSnapshot = async (
  options: ExecuteOptions = {},
): Promise<Result<SnapshotOutput, AgentBrowserError>> => {
  return (await executeCommand('snapshot', ['--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SnapshotOutputSchema, 'snapshot'),
  );
};
