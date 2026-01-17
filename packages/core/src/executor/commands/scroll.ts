import type { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { ScrollCommand, ScrollIntoViewCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * scroll コマンドのハンドラ
 *
 * ページを指定された方向と量でスクロールする。
 * agent-browser の scroll コマンドを実行する。
 *
 * @param command - scroll コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScroll = async (
  command: ScrollCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (
    await executeCommand(
      'scroll',
      [command.direction, command.amount.toString(), '--json'],
      context.executeOptions,
    )
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * scrollIntoView コマンドのハンドラ
 *
 * 指定されたセレクタの要素がビューポートに表示されるようにスクロールする。
 * agent-browser の scrollintoview コマンドを実行する。
 *
 * @param command - scrollIntoView コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScrollIntoView = async (
  command: ScrollIntoViewCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (
    await executeCommand('scrollintoview', [command.selector, '--json'], context.executeOptions)
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
