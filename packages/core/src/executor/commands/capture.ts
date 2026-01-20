import { type ResultAsync, errAsync } from 'neverthrow';
import { browserScreenshot, browserSnapshot, asFilePath } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { ScreenshotCommand, SnapshotCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * screenshot コマンドのハンドラ
 *
 * ページのスクリーンショットを撮影し、指定されたパスに保存する。
 * fullオプションがtrueの場合、ページ全体のスクリーンショットを撮影する。
 *
 * @param command - screenshot コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScreenshot = (
  command: ScreenshotCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // ファイルパス検証とブラウザ操作実行
  return asFilePath(command.path).match(
    (filePath) =>
      browserScreenshot(filePath, {
        ...context.executeOptions,
        fullPage: command.fullPage,
      }).map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      })),
    (error) => errAsync(error),
  );
};

/**
 * snapshot コマンドのハンドラ
 *
 * ページの構造をスナップショットとして取得する。
 * agent-browser の snapshot コマンドを実行し、ページの要素構造を返す。
 *
 * @param command - snapshot コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleSnapshot = (
  command: SnapshotCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return browserSnapshot(context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
