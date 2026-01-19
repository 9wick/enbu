import type { Result } from 'neverthrow';
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
 */
const resolveSelector = (originalSelector: string, context: ExecutionContext): Selector => {
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
  const selector = resolveSelector(command.selector, context);

  return (await browserClick(selector, context.executeOptions)).map((output) => ({
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
  const selector = resolveSelector(command.selector, context);

  return (await browserType(selector, command.value, context.executeOptions)).map((output) => ({
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
 * @returns コマンド実行結果を含むResult型
 */
export const handleFill = async (
  command: FillCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();
  const selector = resolveSelector(command.selector, context);

  return (await browserFill(selector, command.value, context.executeOptions)).map((output) => ({
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
 * @returns コマンド実行結果を含むResult型
 */
export const handlePress = async (
  command: PressCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (await browserPress(asKeyboardKey(command.key), context.executeOptions)).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};
