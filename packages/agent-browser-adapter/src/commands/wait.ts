/**
 * 待機系コマンド
 *
 * ブラウザの状態変化を待機するコマンドを提供する。
 * waitコマンドの複数のパターンを個別の関数に分割して型安全に提供する。
 */

import type { Result } from 'neverthrow';
import type {
  AgentBrowserError,
  ExecuteOptions,
  JsExpression,
  LoadState,
  Selector,
} from '../types';
import type { SimpleActionOutput } from '../schemas';
import { SimpleActionOutputSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateOutput } from '../validator';

/**
 * 指定したミリ秒だけ待機する
 *
 * @param ms - 待機時間（ミリ秒）
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForMs = async (
  ms: number,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('wait', [ms.toString(), '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'wait'),
  );
};

/**
 * 指定したセレクタの要素が出現するまで待機する
 *
 * @param selector - 待機対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForSelector = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('wait', [selector, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'wait'),
  );
};

/**
 * 指定したテキストがページに出現するまで待機する
 *
 * @param text - 待機対象のテキスト
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForText = async (
  text: string,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('wait', ['--text', text, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'wait'),
  );
};

/**
 * 指定したロード状態になるまで待機する
 *
 * @param state - 待機するロード状態
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForLoad = async (
  state: LoadState,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('wait', ['--load', state, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'wait'),
  );
};

/**
 * ネットワークがアイドル状態になるまで待機する
 *
 * browserWaitForLoad('networkidle') のショートカット
 *
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForNetworkIdle = async (
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return browserWaitForLoad('networkidle', options);
};

/**
 * URLが指定したパターンに変化するまで待機する
 *
 * @param pattern - URLのパターン（正規表現文字列）
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForUrl = async (
  pattern: string,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('wait', ['--url', pattern, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'wait'),
  );
};

/**
 * 指定したJavaScript式がtruthyになるまで待機する
 *
 * @param expression - JavaScript式
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserWaitForFunction = async (
  expression: JsExpression,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('wait', ['--fn', expression, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'wait'),
  );
};
