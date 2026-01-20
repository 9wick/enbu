/**
 * スクロール系コマンド
 *
 * ブラウザのスクロール操作に関するコマンドを提供する。
 */

import { type ResultAsync } from 'neverthrow';
import type {
  AgentBrowserError,
  CssSelector,
  ExecuteOptions,
  RefSelector,
  ScrollDirection,
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
 * ページを指定した方向と量でスクロールする
 *
 * @param direction - スクロール方向
 * @param amount - スクロール量（ピクセル）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserScroll = (
  direction: ScrollDirection,
  amount: number,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('scroll', [direction, amount.toString(), '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'scroll'),
  );

/**
 * 指定したセレクタの要素がビューポートに表示されるようにスクロールする
 *
 * @param selector - スクロール先のセレクタ（CssSelector または RefSelector）
 * @param options - 実行オプション
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserScrollIntoView = (
  selector: CliSelector,
  options: ExecuteOptions = {},
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('scrollintoview', [selector, '--json'], options).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'scrollintoview'),
  );
