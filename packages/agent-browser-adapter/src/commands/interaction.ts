/**
 * インタラクション系コマンド
 *
 * ブラウザ要素との対話に関するコマンドを提供する。
 */

import type { ResultAsync } from 'neverthrow';
import { executeCommand } from '../executor';
import type { EmptyData } from '../schemas';
import { EmptyDataSchema } from '../schemas';
import type { AgentBrowserError, CliSelector, ExecuteOptions, KeyboardKey } from '../types';
import { validateAndExtractData } from '../validator';

/**
 * 指定したセレクタの要素をクリックする
 *
 * @param selector - クリック対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserClick = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('click', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'click'),
  );

/**
 * 指定したセレクタの要素をダブルクリックする
 *
 * @param selector - ダブルクリック対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserDblclick = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('dblclick', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'dblclick'),
  );

/**
 * 指定したセレクタの要素にテキストを入力する（既存テキストはクリアしない）
 *
 * @param selector - 入力対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param value - 入力するテキスト
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserType = (
  selector: CliSelector,
  value: string,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('type', [selector, value, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'type'),
  );

/**
 * 指定したセレクタのフォーム要素にテキストを入力する（既存テキストをクリア）
 *
 * @param selector - 入力対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param value - 入力するテキスト
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserFill = (
  selector: CliSelector,
  value: string,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('fill', [selector, value, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'fill'),
  );

/**
 * 指定したキーボードキーを押す
 *
 * @param key - 押すキー
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserPress = (
  key: KeyboardKey,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('press', [key, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'press'),
  );

/**
 * 指定したキーボードキーを押下する（押したまま）
 *
 * @param key - 押下するキー
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserKeydown = (
  key: KeyboardKey,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('keydown', [key, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'keydown'),
  );

/**
 * 指定したキーボードキーを離す
 *
 * @param key - 離すキー
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserKeyup = (
  key: KeyboardKey,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('keyup', [key, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'keyup'),
  );

/**
 * 指定したセレクタの要素にマウスホバーする
 *
 * @param selector - ホバー対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserHover = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('hover', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'hover'),
  );

/**
 * 指定したセレクタのセレクトボックスから値を選択する
 *
 * @param selector - セレクトボックスのセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param value - 選択する値
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserSelect = (
  selector: CliSelector,
  value: string,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('select', [selector, value, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'select'),
  );

/**
 * 指定したセレクタの要素にフォーカスする
 *
 * @param selector - フォーカス対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserFocus = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('focus', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'focus'),
  );

/**
 * 指定したセレクタのチェックボックスをチェックする
 *
 * @param selector - チェック対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserCheck = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('check', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'check'),
  );

/**
 * 指定したセレクタのチェックボックスのチェックを外す
 *
 * @param selector - チェック解除対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserUncheck = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('uncheck', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'uncheck'),
  );
