import type { AgentBrowserError, Selector } from '@packages/agent-browser-adapter';
import {
  asSelector,
  browserClick,
  browserFill,
  browserPress,
  browserType,
} from '@packages/agent-browser-adapter';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import type { ClickCommand, FillCommand, PressCommand, TypeCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';

/**
 * セレクタを解決してResultAsyncに変換する
 * autoWaitで解決されたresolvedRefがあればそれを使用、なければ元のセレクタを使用
 *
 * resolvedRefState.refはstring型なので、asSelectorで検証が必要
 *
 * @returns セレクタのResultAsync型。空文字列の場合はエラー。
 */
const resolveSelectorAsync = (
  originalSelector: Selector,
  context: ExecutionContext,
): ResultAsync<Selector, AgentBrowserError> => {
  // resolvedRefがあればそれを検証して使用、なければ元のSelectorをそのまま使用
  if (context.resolvedRefState.status === 'resolved') {
    return asSelector(context.resolvedRefState.ref).match(
      (selector) => okAsync(selector),
      (error) => errAsync(error),
    );
  }
  return okAsync(originalSelector);
};

/**
 * click コマンドのハンドラ
 *
 * 指定されたセレクタの要素をクリックする。
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

  return resolveSelectorAsync(command.selector, context)
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

  return resolveSelectorAsync(command.selector, context)
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

  return resolveSelectorAsync(command.selector, context)
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
