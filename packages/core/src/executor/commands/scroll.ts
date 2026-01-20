/**
 * スクロール系コマンドハンドラ
 *
 * scroll, scrollIntoView などのスクロール操作系コマンドを処理する。
 */

import type {
  AgentBrowserError,
  CssSelector,
  ScrollDirection,
} from '@packages/agent-browser-adapter';
import {
  browserFocus,
  browserScroll,
  browserScrollIntoView,
  browserWaitForText,
} from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { ScrollCommand, ScrollIntoViewCommand } from '../../types';
import type { CommandResult, ExecutionContext, ExecutorError } from '../result';
import {
  resolveCliSelector,
  getSelectorString,
  isRefSelector,
  isTextSelector,
  type CliSelector,
} from './cli-selector-utils';

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
 * TextSelectorのscrollIntoView処理
 *
 * TextSelectorの場合、Playwrightの `text=<text>` 形式を使用して
 * 要素までスクロールする。まずbrowserWaitForTextで要素の存在を確認し、
 * その後 `text=<text>` 形式でscrollIntoViewを実行する。
 *
 * @param textStr - テキスト文字列
 * @param context - 実行コンテキスト
 * @param startTime - 開始時刻
 * @returns コマンド実行結果
 */
const handleTextSelectorScrollIntoView = (
  textStr: string,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  browserWaitForText(textStr, context.executeOptions)
    .andThen(() => {
      // Playwrightの text= 形式でスクロール
      const textSelector = `text=${textStr}` as CssSelector;
      return browserScrollIntoView(textSelector, context.executeOptions);
    })
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));

/**
 * CSS/RefセレクタのscrollIntoView処理
 *
 * CssSelectorまたはRefSelectorの要素までスクロールする。
 *
 * 注意: agent-browser 0.5.0 の scrollintoview コマンドには @ref 形式を
 * サポートしないバグがある（browser.getLocator() を使用していない）。
 * そのため、@ref 形式の場合は focus コマンドを使用してスクロールを実現する。
 * focus コマンドは Playwright の focus() を使用し、要素をビューポートに
 * 表示するためにスクロールする動作を持つ。
 *
 * @param command - scrollIntoView コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @param startTime - 開始時刻
 * @returns コマンド実行結果
 */
const handleCssOrRefScrollIntoView = (
  command: ScrollIntoViewCommand,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  resolveCliSelector(command, context).andThen((selector: CliSelector) => {
    // resolvedRefStateまたは元のセレクタがRef形式かチェック
    // agent-browser の scrollintoview は @ref 形式をサポートしないバグがあるため、
    // @ref 形式の場合は focus コマンドで代用する（focus は要素をビューポートに表示する）
    const selectorString =
      context.resolvedRefState.status === 'resolved'
        ? context.resolvedRefState.ref
        : getSelectorString(command);

    const usesFocusFallback = selectorString.startsWith('@') || isRefSelector(command);

    if (usesFocusFallback) {
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

/**
 * scrollIntoView コマンドのハンドラ
 *
 * 指定されたセレクタの要素がビューポートに表示されるようにスクロールする。
 *
 * 処理の流れ:
 * - TextSelector: browserWaitForTextで存在確認後、text=形式でスクロール
 * - CSSセレクタ/Ref: resolveCliSelectorで解決後、scrollIntoViewを実行
 *   (@ref形式の場合はfocusコマンドで代用)
 *
 * @param command - scrollIntoView コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScrollIntoView = (
  command: ScrollIntoViewCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, ExecutorError> => {
  const startTime = Date.now();
  const selectorStr = getSelectorString(command);

  // TextSelectorの場合: Playwrightの text= 形式でスクロール
  if (isTextSelector(command)) {
    return handleTextSelectorScrollIntoView(selectorStr, context, startTime);
  }

  // CSSセレクタまたはRefセレクタの場合
  return handleCssOrRefScrollIntoView(command, context, startTime);
};
