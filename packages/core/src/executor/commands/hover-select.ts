/**
 * ホバー・セレクト系コマンドハンドラ
 *
 * hover, select などのコマンドを処理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { browserHover, browserSelect } from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { ResolvedHoverCommand, ResolvedSelectCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';
import { resolveCliSelector } from './cli-selector-utils';

/**
 * hover コマンドのハンドラ
 *
 * 指定されたセレクタの要素にマウスホバーする。
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - hover コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleHover = (
  command: ResolvedHoverCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserHover(selector, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * select コマンドのハンドラ
 *
 * 指定されたセレクタのセレクトボックスから値を選択する。
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - select コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleSelect = (
  command: ResolvedSelectCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserSelect(selector, command.value, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
