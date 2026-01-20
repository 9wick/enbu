/**
 * 待機系コマンド
 *
 * ブラウザの状態変化を待機するコマンドを提供する。
 * waitコマンドの複数のパターンを個別の関数に分割して型安全に提供する。
 */

import { type ResultAsync } from 'neverthrow';
import type {
  AgentBrowserError,
  CssSelector,
  ExecuteOptions,
  JsExpression,
  LoadState,
  RefSelector,
} from '../types';
import type { EmptyData } from '../schemas';
import { EmptyDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * CLIに渡せるセレクタ型
 */
type CliSelector = CssSelector | RefSelector;

/**
 * 指定したミリ秒だけ待機する
 *
 * @param ms - 待機時間（ミリ秒）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForMs = (
  ms: number,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('wait', [ms.toString(), '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'wait'),
  );

/**
 * 指定したセレクタの要素が出現するまで待機する
 *
 * @param selector - 待機対象のセレクタ（CssSelector または RefSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForSelector = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('wait', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'wait'),
  );

/**
 * 指定したテキストがページに出現するまで待機する
 *
 * @param text - 待機対象のテキスト
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForText = (
  text: string,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('wait', ['--text', text, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'wait'),
  );

/**
 * 指定したロード状態になるまで待機する
 *
 * @param state - 待機するロード状態
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForLoad = (
  state: LoadState,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('wait', ['--load', state, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'wait'),
  );

/**
 * ネットワークがアイドル状態になるまで待機する
 *
 * browserWaitForLoad('networkidle') のショートカット
 *
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForNetworkIdle = (
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> => browserWaitForLoad('networkidle', options);

/**
 * URLが指定したパターンに変化するまで待機する
 *
 * @param pattern - URLのパターン（正規表現文字列）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForUrl = (
  pattern: string,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('wait', ['--url', pattern, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'wait'),
  );

/**
 * 指定したJavaScript式がtruthyになるまで待機する
 *
 * @param expression - JavaScript式
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserWaitForFunction = (
  expression: JsExpression,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('wait', ['--fn', expression, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'wait'),
  );
