import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { browserScreenshot } from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { ScreenshotCommand } from '../../types';
import { UseDefault } from '../../types/utility-types';
import type { CommandResult, ExecutionContext } from '../result';

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

  // UseDefaultの場合はデフォルト値（fullPage=false、つまりundefinedを渡す）を使用
  const fullPage = command.full === UseDefault ? undefined : command.full;

  // command.path は既に FilePath 型（Branded Type）なので、そのまま使用
  return browserScreenshot(command.path, {
    ...context.executeOptions,
    fullPage,
  }).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
