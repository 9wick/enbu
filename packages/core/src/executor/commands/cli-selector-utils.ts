/**
 * CLIセレクタユーティリティ
 *
 * SelectorSpec (css/ref/text) からCLIに渡すセレクタを取得する。
 * agent-browser CLIは CssSelector | RefSelector のみをサポートするため、
 * TextSelectorはautoWaitでRefSelectorに解決された後に使用する。
 */

import type { AgentBrowserError, CssSelector, RefSelector } from '@packages/agent-browser-adapter';
import { asRefSelector } from '@packages/agent-browser-adapter';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import type { SelectorSpec } from '../../types';
import type { ExecutionContext } from '../result';

/**
 * CLIに渡せるセレクタ型
 *
 * agent-browser CLIは CssSelector または RefSelector のみをサポートする。
 * TextSelectorはautoWaitで解決後にRefSelectorとして渡される。
 */
export type CliSelector = CssSelector | RefSelector;

/**
 * SelectorSpecからセレクタ文字列を取得する
 *
 * autoWaitの入力やエラーメッセージで使用する文字列表現を返す。
 * css/ref/textのいずれかから値を取り出す。
 *
 * @param spec - セレクタ指定
 * @returns セレクタ文字列
 */
export const getSelectorString = (spec: SelectorSpec): string => {
  if ('css' in spec && spec.css !== undefined) {
    return spec.css;
  }
  if ('ref' in spec && spec.ref !== undefined) {
    return spec.ref;
  }
  if ('text' in spec && spec.text !== undefined) {
    return spec.text;
  }
  // TypeScriptの型システムによりここには到達しないが、安全のため
  return '';
};

/**
 * SelectorSpecがTextSelectorかどうかを判定する
 *
 * @param spec - セレクタ指定
 * @returns TextSelectorの場合true
 */
export const isTextSelector = (spec: SelectorSpec): boolean => {
  return 'text' in spec && spec.text !== undefined;
};

/**
 * SelectorSpecがRefSelectorかどうかを判定する
 *
 * @param spec - セレクタ指定
 * @returns RefSelectorの場合true
 */
export const isRefSelector = (spec: SelectorSpec): boolean => {
  return 'ref' in spec && spec.ref !== undefined;
};

/**
 * SelectorSpecがCssSelectorかどうかを判定する
 *
 * @param spec - セレクタ指定
 * @returns CssSelectorの場合true
 */
export const isCssSelector = (spec: SelectorSpec): boolean => {
  return 'css' in spec && spec.css !== undefined;
};

/**
 * SelectorSpecからCLIセレクタを取得する
 *
 * TextSelectorの場合は、autoWaitで解決されたRefを優先使用する。
 * CssSelectorまたはRefSelectorの場合はそのまま使用する。
 *
 * @param spec - セレクタ指定
 * @param context - 実行コンテキスト
 * @returns CLIセレクタのResultAsync
 */
export const resolveCliSelector = (
  spec: SelectorSpec,
  context: ExecutionContext,
): ResultAsync<CliSelector, AgentBrowserError> => {
  // autoWaitで解決されたRefがあればそれを優先使用
  if (context.resolvedRefState.status === 'resolved') {
    return asRefSelector(context.resolvedRefState.ref).match(
      (ref) => okAsync(ref as CliSelector),
      (error) => errAsync(error),
    );
  }

  // CssSelectorまたはRefSelectorの場合はそのまま使用
  if ('css' in spec && spec.css !== undefined) {
    return okAsync(spec.css as CliSelector);
  }
  if ('ref' in spec && spec.ref !== undefined) {
    return okAsync(spec.ref as CliSelector);
  }

  // TextSelectorでautoWaitが解決されていない場合はエラー
  return errAsync({
    type: 'command_execution_failed',
    message: `TextSelector "${getSelectorString(spec)}" was not resolved by autoWait`,
    command: 'resolveCliSelector',
    rawError: 'TextSelector requires autoWait resolution',
  });
};

/**
 * エラーメッセージ用のセレクタ文字列を取得する
 *
 * SelectorSpecから、エラーメッセージに含めるセレクタ文字列を取得する。
 * autoWaitで解決されている場合はその値を、そうでない場合は元の値を返す。
 *
 * @param spec - セレクタ指定
 * @param context - 実行コンテキスト
 * @returns セレクタ文字列
 */
export const getSelectorForErrorMessage = (
  spec: SelectorSpec,
  context: ExecutionContext,
): string => {
  if (context.resolvedRefState.status === 'resolved') {
    return context.resolvedRefState.ref;
  }
  return getSelectorString(spec);
};
