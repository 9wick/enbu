/**
 * セレクタ種別ごとの待機ロジック
 *
 * waitUntilを使って、セレクタ種別に応じた待機処理を提供する。
 * - CSS/XPath: browserIsVisibleで可視性をチェック
 * - Text: snapshotでref変換しながら待機
 */

import type {
  AgentBrowserError,
  CliSelector,
  CssSelector,
  RefSelector,
  SnapshotRefs,
  InteractableTextSelector,
  XpathSelector,
} from '@packages/agent-browser-adapter';
import {
  asCliXpathSelector,
  asRefSelector,
  browserIsVisible,
  browserSnapshot,
} from '@packages/agent-browser-adapter';
import { okAsync, type ResultAsync } from 'neverthrow';
import { match, P } from 'ts-pattern';
import type { ExecutionContext } from './result';
import { type CheckResult, waitUntil } from './wait-until';

/**
 * CSS/XPath用: browserIsVisibleでチェックするcheckFunc
 *
 * @param selector - CLIセレクタ
 * @param context - 実行コンテキスト
 * @returns CheckResult<true>を返すcheckFunc
 */
const createVisibilityCheckFunc =
  (
    selector: CliSelector,
    context: ExecutionContext,
  ): (() => ResultAsync<CheckResult<true>, AgentBrowserError>) =>
  () =>
    browserIsVisible(selector, context.executeOptions).map((data): CheckResult<true> => {
      if (data.visible) {
        return { type: 'found', value: true };
      }
      return { type: 'not_found' };
    });

/**
 * セレクタマッチングの結果型
 */
type MatchResult =
  | { type: 'found'; refId: string }
  | { type: 'not_found' }
  | { type: 'multiple'; refIds: string[] };

/**
 * 要素がテキストセレクタにマッチするかどうかを判定する
 *
 * @param ref - 要素情報
 * @param text - 検索するテキスト
 * @returns マッチする場合はtrue
 */
const isMatchingElement = (ref: { name: string; role: string }, text: string): boolean => {
  return ref.name.includes(text) || ref.role === text || ref.name === text;
};

/**
 * snapshotのrefsからテキストにマッチするrefIdを検索する
 *
 * @param text - 検索するテキスト
 * @param refs - snapshotから取得した要素参照マップ
 * @returns マッチ結果
 */
const findMatchingRefId = (text: string, refs: SnapshotRefs): MatchResult => {
  const matchedRefIds = Object.entries(refs)
    .filter(([, ref]) => isMatchingElement(ref, text))
    .map(([refId]) => refId);

  if (matchedRefIds.length === 0) {
    return { type: 'not_found' };
  }
  if (matchedRefIds.length === 1) {
    return { type: 'found', refId: matchedRefIds[0] };
  }
  return { type: 'multiple', refIds: matchedRefIds };
};

/**
 * InteractableText用: snapshotでref変換しながらチェックするcheckFunc
 *
 * @param interactableText - インタラクティブ要素のテキストセレクタ
 * @param context - 実行コンテキスト
 * @returns CheckResult<RefSelector>を返すcheckFunc
 */
const createTextToRefCheckFunc =
  (
    interactableText: InteractableTextSelector,
    context: ExecutionContext,
  ): (() => ResultAsync<CheckResult<RefSelector>, AgentBrowserError>) =>
  () =>
    browserSnapshot(context.executeOptions).map((snapshotOutput): CheckResult<RefSelector> => {
      const matchResult = findMatchingRefId(interactableText, snapshotOutput.refs);

      return match(matchResult)
        .with({ type: 'found' }, (r) => {
          const refResult = asRefSelector(`@${r.refId}`);
          return refResult.match(
            (ref): CheckResult<RefSelector> => ({ type: 'found', value: ref }),
            (error): CheckResult<RefSelector> => ({
              type: 'error',
              error: {
                type: 'brand_validation_error' as const,
                message: error.message,
                field: error.field,
                value: error.value,
              },
            }),
          );
        })
        .with({ type: 'multiple' }, (r) => ({
          type: 'error' as const,
          error: {
            type: 'command_execution_failed' as const,
            message: `Selector "${interactableText}" matched ${r.refIds.length} elements. Use a more specific selector.`,
            command: 'waitForText',
            rawError: `Multiple matches: ${r.refIds.join(', ')}`,
          },
        }))
        .with({ type: 'not_found' }, () => ({ type: 'not_found' as const }))
        .exhaustive();
    });

/**
 * CSSセレクタの要素が表示されるまで待機する
 *
 * @param css - CSSセレクタ
 * @param context - 実行コンテキスト
 * @returns 成功時: true、失敗時: AgentBrowserError
 */
const waitForCssSelector = (
  css: CssSelector,
  context: ExecutionContext,
): ResultAsync<true, AgentBrowserError> => {
  const checkFunc = createVisibilityCheckFunc(css, context);
  return waitUntil(checkFunc, context, {
    selectorForError: css,
    commandName: 'waitForCssSelector',
  });
};

/**
 * XPathセレクタの要素が表示されるまで待機する
 *
 * @param xpath - XPathセレクタ
 * @param context - 実行コンテキスト
 * @returns 成功時: true、失敗時: AgentBrowserError
 */
const waitForXpathSelector = (
  xpath: XpathSelector,
  context: ExecutionContext,
): ResultAsync<true, AgentBrowserError> => {
  // XPathセレクタをCLI形式に変換
  const cliXpathResult = asCliXpathSelector(`xpath=${xpath}`);
  if (cliXpathResult.isErr()) {
    return okAsync(true); // 変換失敗時はスキップ（後続で失敗する）
  }

  const checkFunc = createVisibilityCheckFunc(cliXpathResult.value, context);
  return waitUntil(checkFunc, context, {
    selectorForError: xpath,
    commandName: 'waitForXpathSelector',
  });
};

/**
 * インタラクティブ要素のテキストセレクタが表示されるまで待機し、RefSelectorに変換する
 *
 * @param interactableText - インタラクティブ要素のテキストセレクタ
 * @param context - 実行コンテキスト
 * @returns 成功時: RefSelector、失敗時: AgentBrowserError
 */
const waitForTextAndResolveRef = (
  interactableText: InteractableTextSelector,
  context: ExecutionContext,
): ResultAsync<RefSelector, AgentBrowserError> => {
  const checkFunc = createTextToRefCheckFunc(interactableText, context);
  return waitUntil(checkFunc, context, {
    selectorForError: interactableText,
    commandName: 'waitForText',
  });
};

/**
 * SelectorSpecに応じた待機処理の結果型
 *
 * - css/xpath: セレクタをそのまま返す（待機は完了）
 * - text: refに変換して返す
 */
export type WaitResult =
  | { readonly type: 'css'; readonly selector: CssSelector }
  | { readonly type: 'xpath'; readonly selector: XpathSelector }
  | { readonly type: 'ref'; readonly selector: RefSelector };

/**
 * SelectorSpec型（css/interactableText/xpathのいずれか）
 *
 * このファイルはインタラクティブ要素専用（snapshot→ref変換が必要）
 */
type SelectorSpec =
  | { css: CssSelector; interactableText?: never; xpath?: never }
  | { css?: never; interactableText: InteractableTextSelector; xpath?: never }
  | { css?: never; interactableText?: never; xpath: XpathSelector };

/**
 * セレクタ種別に応じて待機し、実行可能なセレクタを返す
 *
 * @param spec - セレクタ指定
 * @param context - 実行コンテキスト
 * @returns 成功時: WaitResult、失敗時: AgentBrowserError
 */
export const waitForSelector = (
  spec: SelectorSpec,
  context: ExecutionContext,
): ResultAsync<WaitResult, AgentBrowserError> =>
  match(spec)
    .with({ css: P.string }, (s) =>
      waitForCssSelector(s.css, context).map((): WaitResult => ({ type: 'css', selector: s.css })),
    )
    .with({ xpath: P.string }, (s) =>
      waitForXpathSelector(s.xpath, context).map(
        (): WaitResult => ({ type: 'xpath', selector: s.xpath }),
      ),
    )
    .with({ interactableText: P.string }, (s) =>
      waitForTextAndResolveRef(s.interactableText, context).map(
        (ref): WaitResult => ({ type: 'ref', selector: ref }),
      ),
    )
    .exhaustive();
