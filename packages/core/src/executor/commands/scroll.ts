import type { AgentBrowserError, ScrollDirection, Selector } from '@packages/agent-browser-adapter';
import {
  asSelector,
  browserFocus,
  browserScroll,
  browserScrollIntoView,
} from '@packages/agent-browser-adapter';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import type { ScrollCommand, ScrollIntoViewCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';
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

  // セレクタを解決する関数
  const resolveSelectorAsync = (): ResultAsync<Selector, AgentBrowserError> => {
    // autoWaitで解決されたrefがあればそれを使用（string型なので検証が必要）
    if (context.resolvedRefState.status === 'resolved') {
      return asSelector(context.resolvedRefState.ref).match(
        (selector) => okAsync(selector),
        (error) => errAsync(error),
      );
    }
    // なければ元のセレクタを使用（既にBranded Type）、ただしテキストセレクタの変換は適用
    const resolvedText = resolveTextSelector(command.selector);
    // resolveTextSelectorはstring型を返すので検証が必要
    return asSelector(resolvedText).match(
      (selector) => okAsync(selector),
      (error) => errAsync(error),
    );
  };

  return resolveSelectorAsync().andThen((selector) => {
    // resolvedRefStateまたは変換後のセレクタ文字列をチェック
    const selectorString =
      context.resolvedRefState.status === 'resolved'
        ? context.resolvedRefState.ref
        : resolveTextSelector(command.selector);

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
  });
};
