/**
 * エラー時のスクリーンショット撮影
 *
 * このモジュールはコマンド実行時のエラー発生時に自動的にスクリーンショットを撮影する機能を提供する。
 * スクリーンショットはOS依存の一時ディレクトリに保存され、タイムスタンプを含むファイル名で保存される。
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { browserScreenshot, asFilePath } from '@packages/agent-browser-adapter';
import type { ExecutionContext } from './result';

/**
 * エラー時のスクリーンショットを撮影する
 *
 * コマンド実行中にエラーが発生した際、現在のブラウザの状態をスクリーンショットとして撮影する。
 * スクリーンショットのパスは `{os.tmpdir()}/flow-error-{timestamp}.png` の形式で生成される。
 * Windows、macOS、Linuxなどの各OSで適切な一時ディレクトリが使用される。
 *
 * 撮影が失敗した場合は `undefined` を返す。これはエラーをネストさせないための設計。
 * エラー撮影の失敗は、元のエラーを隠蔽すべきではないため、ログに記録するのみとする。
 *
 * @param context - 実行コンテキスト（セッション名や実行オプションを含む）
 * @returns スクリーンショットのパス、撮影失敗時は undefined
 */
export const captureErrorScreenshot = async (
  context: ExecutionContext,
): Promise<string | undefined> => {
  const timestamp = Date.now();
  const screenshotPath = path.join(os.tmpdir(), `flow-error-${timestamp}.png`);

  // ファイルパス検証 → ブラウザ操作実行
  return asFilePath(screenshotPath).match(
    async (validPath) => {
      const result = await browserScreenshot(validPath, context.executeOptions);
      // 撮影失敗時は undefined を返す
      return result.match(
        () => screenshotPath,
        () => undefined,
      );
    },
    async () => undefined,
  );
};
