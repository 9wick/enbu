import type { Result } from 'neverthrow';
import { err } from 'neverthrow';
import {
  browserClick,
  browserType,
  browserFill,
  browserPress,
  asSelector,
  asKeyboardKey,
} from '@packages/agent-browser-adapter';
import type { AgentBrowserError, Selector } from '@packages/agent-browser-adapter';
import type { ClickCommand, TypeCommand, FillCommand, PressCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * セレクタを解決する
 * autoWaitで解決されたresolvedRefがあればそれを使用、なければ元のセレクタを使用
 *
 * @returns セレクタのResult型。空文字列の場合はエラー。
 */
const resolveSelector = (
  originalSelector: string,
  context: ExecutionContext,
): Result<Selector, AgentBrowserError> => {
  return asSelector(context.resolvedRef ?? originalSelector);
};

/**
 * click コマンドのハンドラ
 *
 * 指定されたセレクタの要素をクリックする。
 *
 * @param command - click コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleClick = async (
  command: ClickCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // セレクタ検証
  const selectorResult = resolveSelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  // ブラウザ操作実行
  return (await browserClick(selectorResult.value, context.executeOptions)).map((output) => ({
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
 * @returns コマンド実行結果を含むResult型
 */
export const handleType = async (
  command: TypeCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // セレクタ検証
  const selectorResult = resolveSelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  // ブラウザ操作実行
  return (await browserType(selectorResult.value, command.value, context.executeOptions)).map(
    (output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }),
  );
};

/**
 * fill コマンドのハンドラ
 *
 * 指定されたセレクタのフォーム要素にテキストを入力する。
 * 既存のテキストは自動的にクリアされる。
 *
 * @param command - fill コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleFill = async (
  command: FillCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // セレクタ検証
  const selectorResult = resolveSelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  // ブラウザ操作実行
  return (await browserFill(selectorResult.value, command.value, context.executeOptions)).map(
    (output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }),
  );
};

/**
 * press コマンドのハンドラ
 *
 * 指定されたキーボードキーを押す。
 * agent-browser の press コマンドを実行する。
 *
 * @param command - press コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handlePress = async (
  command: PressCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // キー検証
  const keyResult = asKeyboardKey(command.key);
  if (keyResult.isErr()) {
    return err(keyResult.error);
  }

  // ブラウザ操作実行
  return (await browserPress(keyResult.value, context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
