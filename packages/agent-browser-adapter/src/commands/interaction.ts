/**
 * インタラクション系コマンド
 *
 * ブラウザ要素との対話に関するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, KeyboardKey, Selector } from '../types';
import type { EmptyData } from '../schemas';
import { EmptyDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * 指定したセレクタの要素をクリックする
 *
 * @param selector - クリック対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserClick = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('click', [selector, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'click'),
  );
};

/**
 * 指定したセレクタの要素にテキストを入力する（既存テキストはクリアしない）
 *
 * @param selector - 入力対象のセレクタ
 * @param value - 入力するテキスト
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserType = async (
  selector: Selector,
  value: string,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('type', [selector, value, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'type'),
  );
};

/**
 * 指定したセレクタのフォーム要素にテキストを入力する（既存テキストをクリア）
 *
 * @param selector - 入力対象のセレクタ
 * @param value - 入力するテキスト
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserFill = async (
  selector: Selector,
  value: string,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('fill', [selector, value, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'fill'),
  );
};

/**
 * 指定したキーボードキーを押す
 *
 * @param key - 押すキー
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserPress = async (
  key: KeyboardKey,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('press', [key, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'press'),
  );
};

/**
 * 指定したセレクタの要素にマウスホバーする
 *
 * @param selector - ホバー対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserHover = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('hover', [selector, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'hover'),
  );
};

/**
 * 指定したセレクタのセレクトボックスから値を選択する
 *
 * @param selector - セレクトボックスのセレクタ
 * @param value - 選択する値
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserSelect = async (
  selector: Selector,
  value: string,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('select', [selector, value, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'select'),
  );
};

/**
 * 指定したセレクタの要素にフォーカスする
 *
 * @param selector - フォーカス対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserFocus = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<EmptyData, AgentBrowserError>> => {
  return (await executeCommand('focus', [selector, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'focus'),
  );
};
