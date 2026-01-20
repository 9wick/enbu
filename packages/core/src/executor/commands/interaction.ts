/**
 * インタラクション系コマンドハンドラ
 *
 * click, type, fill, press などのユーザー操作系コマンドを処理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import {
  browserClick,
  browserFill,
  browserPress,
  browserType,
} from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { ClickCommand, FillCommand, PressCommand, TypeCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';
import { resolveCliSelector } from './cli-selector-utils';

/**
 * click コマンドのハンドラ
 *
 * 指定されたセレクタの要素をクリックする。
 * SelectorSpec (css/ref/text) からCLIセレクタを解決して実行する。
 *
 * @param command - click コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleClick = (
  command: ClickCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserClick(selector, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * type コマンドのハンドラ
 *
 * 指定されたセレクタの要素にテキストを入力する。
 * SelectorSpec (css/ref/text) からCLIセレクタを解決して実行する。
 *
 * @param command - type コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleType = (
  command: TypeCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserType(selector, command.value, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * fill コマンドのハンドラ
 *
 * 指定されたセレクタのフォーム要素にテキストを入力する。
 * 既存のテキストは自動的にクリアされる。
 * SelectorSpec (css/ref/text) からCLIセレクタを解決して実行する。
 *
 * @param command - fill コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleFill = (
  command: FillCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserFill(selector, command.value, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * press コマンドのハンドラ
 *
 * 指定されたキーボードキーを押す。
 * agent-browser の press コマンドを実行する。
 *
 * @param command - press コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handlePress = (
  command: PressCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // command.key は既に KeyboardKey 型（Branded Type）なので、そのまま使用
  return browserPress(command.key, context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
