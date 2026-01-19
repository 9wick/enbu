import type { Result } from 'neverthrow';
import { err } from 'neverthrow';
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
export const handleScreenshot = async (
  command: ScreenshotCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // ファイルパス検証
  const filePathResult = asFilePath(command.path);
  if (filePathResult.isErr()) {
    return err(filePathResult.error);
  }

  // ブラウザ操作実行
  return (
    await browserScreenshot(filePathResult.value, {
      ...context.executeOptions,
      fullPage: command.fullPage,
    })
  ).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
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
export const handleSnapshot = async (
  command: SnapshotCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (await browserSnapshot(context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
