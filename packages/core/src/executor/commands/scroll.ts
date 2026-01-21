/**
 * スクロール系コマンドハンドラ
 *
 * scroll, scrollIntoView などのスクロール操作系コマンドを処理する。
 */

import type {
  AgentBrowserError,
  CliSelector,
  ScrollDirection,
} from '@packages/agent-browser-adapter';
import {
  asCliTextSelector,
  browserScroll,
  browserScrollIntoView,
  browserWaitForText,
} from '@packages/agent-browser-adapter';
import { errAsync, type ResultAsync } from 'neverthrow';
import type { ScrollCommand, ResolvedScrollIntoViewCommand } from '../../types';
import type { CommandResult, ExecutionContext, ExecutorError } from '../result';
import { resolveCliSelector, getSelectorString, isTextSelector } from './cli-selector-utils';

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
      const cliTextSelectorResult = asCliTextSelector(`text=${textStr}`);
      return cliTextSelectorResult.match(
        (selector) => browserScrollIntoView(selector, context.executeOptions),
        (error) => errAsync(error),
      );
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
 * @param command - scrollIntoView コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @param startTime - 開始時刻
 * @returns コマンド実行結果
 */
const handleCssOrRefScrollIntoView = (
  command: ResolvedScrollIntoViewCommand,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  resolveCliSelector(command, context).andThen((selector: CliSelector) => {
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
 *   （注: ResolvedSelectorSpecにはtextは含まれないが、後方互換のためチェック）
 * - CSSセレクタ/Ref/XPath: resolveCliSelectorで解決後、scrollIntoViewを実行
 *   (@ref形式の場合はfocusコマンドで代用)
 *
 * @param command - scrollIntoView コマンドのパラメータ（解決済み）
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleScrollIntoView = (
  command: ResolvedScrollIntoViewCommand,
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
