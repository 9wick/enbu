import { type ResultAsync, errAsync } from 'neverthrow';
import {
  browserScroll,
  browserScrollIntoView,
  browserFocus,
  asSelector,
} from '@packages/agent-browser-adapter';
import type { AgentBrowserError, ScrollDirection } from '@packages/agent-browser-adapter';
import type { ScrollCommand, ScrollIntoViewCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';
import { resolveTextSelector } from './selector-utils';

/**
 * scroll コマンドのハンドラ
 *
 * ページを指定された方向と量でスクロールする。
 * agent-browser の scroll コマンドを実行する。
 *
 * @param command - scroll コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScroll = (
  command: ScrollCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();
  const direction: ScrollDirection = command.direction;

  return browserScroll(direction, command.amount, context.executeOptions).map((output) => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  }));
};

/**
 * セレクタが@ref形式かどうかを判定する
 *
 * @param selector - 判定するセレクタ
 * @returns @ref形式の場合はtrue
 */
const isRefSelector = (selector: string): boolean => {
  return /^@e\d+$/.test(selector);
};

/**
 * scrollIntoView コマンドのハンドラ
 *
 * 指定されたセレクタの要素がビューポートに表示されるようにスクロールする。
 *
 * 注意: agent-browser 0.5.0 の scrollintoview コマンドには @ref 形式を
 * サポートしないバグがある（browser.getLocator() を使用していない）。
 * そのため、@ref 形式の場合は focus コマンドを使用してスクロールを実現する。
 * focus コマンドは Playwright の focus() を使用し、要素をビューポートに
 * 表示するためにスクロールする動作を持つ。
 *
 * テキストセレクタは自動的に text="..." 形式に変換される。
 *
 * @param command - scrollIntoView コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScrollIntoView = (
  command: ScrollIntoViewCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const startTime = Date.now();
  // autoWaitで解決されたrefがあればそれを使用、なければテキストセレクタの変換を適用
  const selectorString = context.resolvedRef ?? resolveTextSelector(command.selector);

  // セレクタ検証
  return asSelector(selectorString).match(
    (selector) => {
      // agent-browser の scrollintoview は @ref 形式をサポートしないバグがあるため、
      // @ref 形式の場合は focus コマンドで代用する（focus は要素をビューポートに表示する）
      if (isRefSelector(selectorString)) {
        return browserFocus(selector, context.executeOptions).map((output) => ({
          stdout: JSON.stringify(output),
          duration: Date.now() - startTime,
        }));
      }

      return browserScrollIntoView(selector, context.executeOptions).map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
    },
    (error) => errAsync(error),
  );
};
