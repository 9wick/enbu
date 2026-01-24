/**
 * インタラクション系コマンドハンドラ
 *
 * click, type, fill, press などのユーザー操作系コマンドを処理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import {
  browserCheck,
  browserClick,
  browserDblclick,
  browserDrag,
  browserFill,
  browserFocus,
  browserKeydown,
  browserKeyup,
  browserPress,
  browserType,
  browserUncheck,
  browserUpload,
} from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type {
  KeydownCommand,
  KeyupCommand,
  PressCommand,
  ResolvedCheckCommand,
  ResolvedClickCommand,
  ResolvedDblclickCommand,
  ResolvedDragCommand,
  ResolvedFillCommand,
  ResolvedFocusCommand,
  ResolvedTypeCommand,
  ResolvedUncheckCommand,
  ResolvedUploadCommand,
} from '../../types';
import type { CommandResult, ExecutionContext } from '../result';
import { resolveCliSelector } from './cli-selector-utils';

/**
 * click コマンドのハンドラ
 *
 * 指定されたセレクタの要素をクリックする。
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - click コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleClick = (
  command: ResolvedClickCommand,
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
 * dblclick コマンドのハンドラ
 *
 * 指定されたセレクタの要素をダブルクリックする。
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - dblclick コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleDblclick = (
  command: ResolvedDblclickCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserDblclick(selector, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * type コマンドのハンドラ
 *
 * 指定されたセレクタの要素にテキストを入力する。
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - type コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleType = (
  command: ResolvedTypeCommand,
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
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - fill コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleFill = (
  command: ResolvedFillCommand,
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

/**
 * keydown コマンドのハンドラ
 *
 * 指定されたキーボードキーを押下する（押したまま）。
 * agent-browser の keydown コマンドを実行する。
 *
 * @param command - keydown コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleKeydown = (
  command: KeydownCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // command.key は既に KeyboardKey 型（Branded Type）なので、そのまま使用
  return browserKeydown(command.key, context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};

/**
 * keyup コマンドのハンドラ
 *
 * 指定されたキーボードキーを離す。
 * agent-browser の keyup コマンドを実行する。
 *
 * @param command - keyup コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleKeyup = (
  command: KeyupCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // command.key は既に KeyboardKey 型（Branded Type）なので、そのまま使用
  return browserKeyup(command.key, context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};

/**
 * focus コマンドのハンドラ
 *
 * 指定されたセレクタの要素にフォーカスを当てる。
 * ResolvedSelectorSpec (css/ref/xpath) からCLIセレクタを解決して実行する。
 *
 * @param command - focus コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleFocus = (
  command: ResolvedFocusCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserFocus(selector, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * check コマンドのハンドラ
 *
 * 指定されたセレクタのチェックボックスをチェックする。
 * ResolvedSelectorSpec (css/ref/xpath/interactableText) からCLIセレクタを解決して実行する。
 *
 * @param command - check コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleCheck = (
  command: ResolvedCheckCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserCheck(selector, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * uncheck コマンドのハンドラ
 *
 * 指定されたセレクタのチェックボックスのチェックを外す。
 * ResolvedSelectorSpec (css/ref/xpath/interactableText) からCLIセレクタを解決して実行する。
 *
 * @param command - uncheck コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleUncheck = (
  command: ResolvedUncheckCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserUncheck(selector, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * drag コマンドのハンドラ
 *
 * 指定されたソース要素をターゲット要素にドラッグ&ドロップする。
 * source と target の両方のResolvedSelectorSpec (css/ref/xpath/interactableText) から
 * CLIセレクタを解決して実行する。
 *
 * @param command - drag コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleDrag = (
  command: ResolvedDragCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  // sourceとtargetの両方のセレクタを解決してから実行
  return resolveCliSelector(command.source, context)
    .andThen((sourceSelector) =>
      resolveCliSelector(command.target, context).map((targetSelector) => ({
        source: sourceSelector,
        target: targetSelector,
      })),
    )
    .andThen(({ source, target }) => browserDrag(source, target, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * upload コマンドのハンドラ
 *
 * 指定されたセレクタのファイル入力要素にファイルをアップロードする。
 * ResolvedSelectorSpec (css/ref/xpath/interactableText) からCLIセレクタを解決して実行する。
 * filesは単一ファイルまたは複数ファイルの配列。
 *
 * @param command - upload コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResultAsync型
 */
export const handleUpload = (
  command: ResolvedUploadCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();

  return resolveCliSelector(command, context)
    .andThen((selector) => browserUpload(selector, command.files, context.executeOptions))
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
