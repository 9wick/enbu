/**
 * CLIセレクタユーティリティ
 *
 * SelectorSpec (css/text/xpath) からCLIに渡すセレクタを取得する。
 * agent-browser CLIは以下の形式をサポート:
 * - CssSelector: "#id", ".class" などのCSS形式（そのまま渡す）
 * - CliTextSelector: "text=xxx" 形式でテキスト検索
 * - CliXpathSelector: "xpath=//xxx" 形式でXPath検索
 */

import type { AgentBrowserError, CliSelector } from '@packages/agent-browser-adapter';
import { asCliTextSelector, asCliXpathSelector } from '@packages/agent-browser-adapter';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { match, P } from 'ts-pattern';
import type { ResolvedSelectorSpec, SelectorSpec } from '../../types';
import type { ExecutionContext } from '../result';

/**
 * SelectorSpecまたはResolvedSelectorSpecからセレクタ文字列を取得する
 *
 * autoWaitの入力やエラーメッセージで使用する文字列表現を返す。
 * css/text/xpath/refのいずれかから値を取り出す。
 *
 * @param spec - セレクタ指定
 * @returns セレクタ文字列
 */
export const getSelectorString = (spec: SelectorSpec | ResolvedSelectorSpec): string =>
  match(spec)
    .with({ css: P.string }, (s) => s.css)
    .with({ interactableText: P.string }, (s) => s.interactableText)
    .with({ anyText: P.string }, (s) => s.anyText)
    .with({ xpath: P.string }, (s) => s.xpath)
    .with({ ref: P.string }, (s) => s.ref)
    .exhaustive();

/**
 * SelectorSpecまたはResolvedSelectorSpecがTextSelectorかどうかを判定する
 *
 * @param spec - セレクタ指定
 * @returns InteractableTextSelectorまたはAnyTextSelectorの場合true
 */
export const isTextSelector = (spec: SelectorSpec | ResolvedSelectorSpec): boolean =>
  match(spec)
    .with({ interactableText: P.string }, () => true)
    .with({ anyText: P.string }, () => true)
    .otherwise(() => false);

/**
 * SelectorSpecまたはResolvedSelectorSpecからCLIセレクタを取得する
 *
 * agent-browser CLIに渡すセレクタ文字列を生成する。
 * - CssSelector: そのまま使用
 * - RefSelector: そのまま使用
 * - TextSelector: "text=" プレフィックスを付与してCliTextSelectorに変換
 * - XpathSelector: "xpath=" プレフィックスを付与してCliXpathSelectorに変換
 *
 * autoWaitで解決されたRefがある場合はそれを優先使用する。
 *
 * @param spec - セレクタ指定
 * @param context - 実行コンテキスト
 * @returns CLIセレクタのResultAsync
 */
export const resolveCliSelector = (
  spec: SelectorSpec | ResolvedSelectorSpec,
  _context: ExecutionContext,
): ResultAsync<CliSelector, AgentBrowserError> =>
  match(spec)
    .with({ css: P.string }, (s) => {
      const selector: CliSelector = s.css;
      return okAsync(selector);
    })
    .with({ ref: P.string }, (s) => {
      const selector: CliSelector = s.ref;
      return okAsync(selector);
    })
    .with({ interactableText: P.string }, (s) => {
      // InteractableTextSelector → CliTextSelector に変換
      const cliTextSelectorValue = `text=${s.interactableText}`;
      return asCliTextSelector(cliTextSelectorValue).match(
        (cliTextSelector) => {
          const selector: CliSelector = cliTextSelector;
          return okAsync(selector);
        },
        (error) => errAsync(error),
      );
    })
    .with({ anyText: P.string }, (s) => {
      // AnyTextSelector → CliTextSelector に変換
      const cliTextSelectorValue = `text=${s.anyText}`;
      return asCliTextSelector(cliTextSelectorValue).match(
        (cliTextSelector) => {
          const selector: CliSelector = cliTextSelector;
          return okAsync(selector);
        },
        (error) => errAsync(error),
      );
    })
    .with({ xpath: P.string }, (s) => {
      // XpathSelector → CliXpathSelector に変換
      const cliXpathSelectorValue = `xpath=${s.xpath}`;
      return asCliXpathSelector(cliXpathSelectorValue).match(
        (cliXpathSelector) => {
          const selector: CliSelector = cliXpathSelector;
          return okAsync(selector);
        },
        (error) => errAsync(error),
      );
    })
    .exhaustive();

/**
 * エラーメッセージ用のセレクタ文字列を取得する
 *
 * SelectorSpecまたはResolvedSelectorSpecから、エラーメッセージに含めるセレクタ文字列を取得する。
 * autoWaitで解決されている場合はその値を、そうでない場合は元の値を返す。
 *
 * @param spec - セレクタ指定
 * @param context - 実行コンテキスト
 * @returns セレクタ文字列
 */
export const getSelectorForErrorMessage = (
  spec: SelectorSpec | ResolvedSelectorSpec,
  _context: ExecutionContext,
): string => {
  return getSelectorString(spec);
};
