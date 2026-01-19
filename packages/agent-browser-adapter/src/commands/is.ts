/**
 * 状態チェックコマンド
 *
 * ブラウザ要素の状態を確認するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, Selector } from '../types';
import type { IsCheckedOutput, IsEnabledOutput, IsVisibleOutput } from '../schemas';
import { IsCheckedOutputSchema, IsEnabledOutputSchema, IsVisibleOutputSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateOutput } from '../validator';

/**
 * 指定したセレクタの要素が表示されているかチェックする
 *
 * @param selector - チェック対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: IsVisibleOutput、失敗時: AgentBrowserError
 */
export const browserIsVisible = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<IsVisibleOutput, AgentBrowserError>> => {
  return (await executeCommand('is', ['visible', selector, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, IsVisibleOutputSchema, 'is visible'),
  );
};

/**
 * 指定したセレクタの要素が有効化されているかチェックする
 *
 * @param selector - チェック対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: IsEnabledOutput、失敗時: AgentBrowserError
 */
export const browserIsEnabled = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<IsEnabledOutput, AgentBrowserError>> => {
  return (await executeCommand('is', ['enabled', selector, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, IsEnabledOutputSchema, 'is enabled'),
  );
};

/**
 * 指定したセレクタのチェックボックスがチェックされているかチェックする
 *
 * @param selector - チェック対象のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: IsCheckedOutput、失敗時: AgentBrowserError
 */
export const browserIsChecked = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<IsCheckedOutput, AgentBrowserError>> => {
  return (await executeCommand('is', ['checked', selector, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, IsCheckedOutputSchema, 'is checked'),
  );
};
