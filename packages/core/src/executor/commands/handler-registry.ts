import type { Result } from 'neverthrow';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { Command } from '../../types';
import type { CommandHandler, ExecutionContext, CommandResult, ExecutorError } from '../result';
import { handleOpen } from './navigation';
import { handleClick, handleType, handleFill, handlePress } from './interaction';
import { handleHover, handleSelect } from './hover-select';
import { handleScroll, handleScrollIntoView } from './scroll';
import { handleWait } from './wait';
import { handleScreenshot, handleSnapshot } from './capture';
import { handleEval } from './eval';
import {
  handleAssertVisible,
  handleAssertNotVisible,
  handleAssertEnabled,
  handleAssertChecked,
} from './assertions';

/**
 * コマンド名に対応するハンドラを取得する
 *
 * コマンド名からそれに対応するハンドラ関数を取得する。
 * 未実装のコマンドが指定された場合はエラーをthrowする。
 *
 * @param commandName - コマンド名
 * @returns コマンドハンドラ関数
 * @throws {Error} 未実装のコマンドが指定された場合
 */
/**
 * ナビゲーション・入力系コマンドのルーター
 */
const routeNavigationInputCommand = (
  command: Command,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> | null => {
  switch (command.command) {
    case 'open':
      return handleOpen(command, context);
    case 'click':
      return handleClick(command, context);
    case 'type':
      return handleType(command, context);
    case 'fill':
      return handleFill(command, context);
    default:
      return null;
  }
};

/**
 * インタラクション系コマンドのルーター
 */
const routeInteractionCommand = (
  command: Command,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> | null => {
  switch (command.command) {
    case 'press':
      return handlePress(command, context);
    case 'hover':
      return handleHover(command, context);
    case 'select':
      return handleSelect(command, context);
    default:
      return null;
  }
};

/**
 * スクロール・待機系コマンドのルーター
 */
const routeScrollWaitCommand = (
  command: Command,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> | null => {
  switch (command.command) {
    case 'scroll':
      return handleScroll(command, context);
    case 'scrollIntoView':
      return handleScrollIntoView(command, context);
    case 'wait':
      return handleWait(command, context);
    default:
      return null;
  }
};

/**
 * assertion系コマンドのルーター
 */
const routeAssertionCommand = (
  command: Command,
  context: ExecutionContext,
): Promise<Result<CommandResult, ExecutorError>> | null => {
  switch (command.command) {
    case 'assertVisible':
      return handleAssertVisible(command, context);
    case 'assertNotVisible':
      return handleAssertNotVisible(command, context);
    case 'assertEnabled':
      return handleAssertEnabled(command, context);
    case 'assertChecked':
      return handleAssertChecked(command, context);
    default:
      return null;
  }
};

/**
 * キャプチャ・eval系コマンドのルーター
 */
const routeUtilityCommand = (
  command: Command,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> | null => {
  switch (command.command) {
    case 'screenshot':
      return handleScreenshot(command, context);
    case 'snapshot':
      return handleSnapshot(command, context);
    case 'eval':
      return handleEval(command, context);
    default:
      return null;
  }
};

/**
 * コマンドを実行するルーター関数
 *
 * command.commandフィールドで型を絞り込み、対応するハンドラを呼び出す。
 */
const routeCommand: CommandHandler<Command> = (command, context) => {
  // コマンドをグループ分けして複雑度を下げる
  const result =
    routeNavigationInputCommand(command, context) ??
    routeInteractionCommand(command, context) ??
    routeScrollWaitCommand(command, context) ??
    routeUtilityCommand(command, context) ??
    routeAssertionCommand(command, context);

  return result!;
};

export const getCommandHandler = (_commandName: string): CommandHandler<Command> => {
  // コマンド名によるルーティング
  // 型の共変性の問題により、各ハンドラを直接返すことはできない
  // そのため、ラッパー関数を使って型を適合させる
  return routeCommand;
};
