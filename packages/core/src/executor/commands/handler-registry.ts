import type { ResultAsync } from 'neverthrow';
import { match } from 'ts-pattern';
import type { ResolvedCommand } from '../../types';
import type { CommandHandler, CommandResult, ExecutorError } from '../result';
import {
  handleAssertChecked,
  handleAssertEnabled,
  handleAssertNotVisible,
  handleAssertVisible,
} from './assertions';
import { handleScreenshot } from './capture';
import { handleEval } from './eval';
import { handleHover, handleSelect } from './hover-select';
import { handleClick, handleFill, handlePress, handleType } from './interaction';
import { handleOpen } from './navigation';
import { handleScroll, handleScrollIntoView } from './scroll';
import { handleWait } from './wait';

/**
 * コマンドを実行するルーター関数
 *
 * ts-patternのmatchで網羅的にコマンドをルーティングする。
 * exhaustive()により、ResolvedCommand型の全バリアントがカバーされていることを型レベルで保証する。
 * returnType で戻り型を明示することで、各ハンドラのエラー型が ExecutorError に拡大される。
 */
const routeCommand: CommandHandler<ResolvedCommand> = (command, context) =>
  match(command)
    .returnType<ResultAsync<CommandResult, ExecutorError>>()
    // ナビゲーション・入力系
    .with({ command: 'open' }, (cmd) => handleOpen(cmd, context))
    .with({ command: 'click' }, (cmd) => handleClick(cmd, context))
    .with({ command: 'type' }, (cmd) => handleType(cmd, context))
    .with({ command: 'fill' }, (cmd) => handleFill(cmd, context))
    // インタラクション系
    .with({ command: 'press' }, (cmd) => handlePress(cmd, context))
    .with({ command: 'hover' }, (cmd) => handleHover(cmd, context))
    .with({ command: 'select' }, (cmd) => handleSelect(cmd, context))
    // スクロール・待機系
    .with({ command: 'scroll' }, (cmd) => handleScroll(cmd, context))
    .with({ command: 'scrollIntoView' }, (cmd) => handleScrollIntoView(cmd, context))
    .with({ command: 'wait' }, (cmd) => handleWait(cmd, context))
    // キャプチャ・eval系
    .with({ command: 'screenshot' }, (cmd) => handleScreenshot(cmd, context))
    .with({ command: 'eval' }, (cmd) => handleEval(cmd, context))
    // assertion系
    .with({ command: 'assertVisible' }, (cmd) => handleAssertVisible(cmd, context))
    .with({ command: 'assertNotVisible' }, (cmd) => handleAssertNotVisible(cmd, context))
    .with({ command: 'assertEnabled' }, (cmd) => handleAssertEnabled(cmd, context))
    .with({ command: 'assertChecked' }, (cmd) => handleAssertChecked(cmd, context))
    .exhaustive();

export const getCommandHandler = (_commandName: string): CommandHandler<ResolvedCommand> => {
  // コマンド名によるルーティング
  // 型の共変性の問題により、各ハンドラを直接返すことはできない
  // そのため、ラッパー関数を使って型を適合させる
  return routeCommand;
};
