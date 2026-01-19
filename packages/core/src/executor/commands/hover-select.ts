import type { Result } from 'neverthrow';
import { browserHover, browserSelect, asSelector } from '@packages/agent-browser-adapter';
import type { AgentBrowserError, Selector } from '@packages/agent-browser-adapter';
import type { HoverCommand, SelectCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * セレクタを解決する
 * autoWaitで解決されたresolvedRefがあればそれを使用、なければ元のセレクタを使用
 */
const resolveSelector = (originalSelector: string, context: ExecutionContext): Selector => {
  return asSelector(context.resolvedRef ?? originalSelector);
};

/**
 * hover コマンドのハンドラ
 *
 * 指定されたセレクタの要素にマウスホバーする。
 * agent-browser の hover コマンドを実行する。
 *
 * @param command - hover コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleHover = async (
  command: HoverCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();
  const selector = resolveSelector(command.selector, context);

  return (await browserHover(selector, context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};

/**
 * select コマンドのハンドラ
 *
 * 指定されたセレクタのセレクトボックスから値を選択する。
 * agent-browser の select コマンドを実行する。
 *
 * @param command - select コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleSelect = async (
  command: SelectCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();
  const selector = resolveSelector(command.selector, context);

  return (await browserSelect(selector, command.value, context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
