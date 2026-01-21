/**
 * 状態チェックコマンド
 *
 * ブラウザ要素の状態を確認するコマンドを提供する。
 */

import type { ResultAsync } from 'neverthrow';
import { executeCommand } from '../executor';
import type { IsCheckedData, IsEnabledData, IsVisibleData } from '../schemas';
import { IsCheckedDataSchema, IsEnabledDataSchema, IsVisibleDataSchema } from '../schemas';
import type { AgentBrowserError, CliSelector, ExecuteOptions } from '../types';
import { validateAndExtractData } from '../validator';

/**
 * 指定したセレクタの要素が表示されているかチェックする
 *
 * @param selector - チェック対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: IsVisibleData、失敗時: AgentBrowserError
 */
export const browserIsVisible = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<IsVisibleData, AgentBrowserError> =>
  executeCommand('is', ['visible', selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, IsVisibleDataSchema, 'is visible'),
  );

/**
 * 指定したセレクタの要素が有効化されているかチェックする
 *
 * @param selector - チェック対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: IsEnabledData、失敗時: AgentBrowserError
 */
export const browserIsEnabled = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<IsEnabledData, AgentBrowserError> =>
  executeCommand('is', ['enabled', selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, IsEnabledDataSchema, 'is enabled'),
  );

/**
 * 指定したセレクタのチェックボックスがチェックされているかチェックする
 *
 * @param selector - チェック対象のセレクタ（CssSelector、RefSelector、CliTextSelector、CliXpathSelector）
 * @param options - 実行オプション
 * @returns 成功時: IsCheckedData、失敗時: AgentBrowserError
 */
export const browserIsChecked = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<IsCheckedData, AgentBrowserError> =>
  executeCommand('is', ['checked', selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, IsCheckedDataSchema, 'is checked'),
  );
