import type { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { ClickCommand, TypeCommand, FillCommand, PressCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * click コマンドのハンドラ
 *
 * 指定されたセレクタの要素をクリックする。
 * indexオプションが指定された場合、同名要素の中から該当するインデックスの要素をクリックする。
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

  const args = [command.selector];
  if (command.index !== undefined) {
    args.push('--index', command.index.toString());
  }
  args.push('--json');

  return (await executeCommand('click', args, context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * type コマンドのハンドラ
 *
 * 指定されたセレクタの要素にテキストを入力する。
 * clearオプションがtrueの場合、入力前に既存のテキストをクリアする。
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

  const args = [command.selector, command.value];
  if (command.clear) {
    args.push('--clear');
  }
  args.push('--json');

  return (await executeCommand('type', args, context.executeOptions))
    .andThen(parseJsonOutput)
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
 * @returns コマンド実行結果を含むResult型
 */
export const handleFill = async (
  command: FillCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (
    await executeCommand(
      'fill',
      [command.selector, command.value, '--json'],
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

  return (await executeCommand('press', [command.key, '--json'], context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
