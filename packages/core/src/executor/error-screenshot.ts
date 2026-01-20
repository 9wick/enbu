/**
 * エラー時のスクリーンショット撮影
 *
 * このモジュールはコマンド実行時のエラー発生時に自動的にスクリーンショットを撮影する機能を提供する。
 * スクリーンショットはOS依存の一時ディレクトリに保存され、タイムスタンプを含むファイル名で保存される。
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ResultAsync } from 'neverthrow';
import {
  asFilePath,
  browserScreenshot,
  type AgentBrowserError,
} from '@packages/agent-browser-adapter';
import type { ExecutionContext } from './result';

/**
 * エラー時のスクリーンショットを撮影する
 *
 * コマンド実行中にエラーが発生した際、現在のブラウザの状態をスクリーンショットとして撮影する。
 * スクリーンショットのパスは `{os.tmpdir()}/flow-error-{timestamp}.png` の形式で生成される。
 * Windows、macOS、Linuxなどの各OSで適切な一時ディレクトリが使用される。
 *
 * 撮影が失敗した場合はエラーを返す。
 *
 * @param context - 実行コンテキスト（セッション名や実行オプションを含む）
 * @returns 成功時: スクリーンショットのパス、失敗時: AgentBrowserError
 */
export const captureErrorScreenshot = (
  context: ExecutionContext,
): ResultAsync<string, AgentBrowserError> => {
  const timestamp = Date.now();
  const screenshotPath = path.join(os.tmpdir(), `flow-error-${timestamp}.png`);

  // ファイルパス検証 → ブラウザ操作実行
  return asFilePath(screenshotPath).asyncAndThen((validPath) =>
    browserScreenshot(validPath, context.executeOptions).map(() => screenshotPath),
  );
};
