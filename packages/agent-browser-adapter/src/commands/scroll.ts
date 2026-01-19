/**
 * スクロール系コマンド
 *
 * ブラウザのスクロール操作に関するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, ScrollDirection, Selector } from '../types';
import type { SimpleActionOutput } from '../schemas';
import { SimpleActionOutputSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateOutput } from '../validator';

/**
 * ページを指定した方向と量でスクロールする
 *
 * @param direction - スクロール方向
 * @param amount - スクロール量（ピクセル）
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserScroll = async (
  direction: ScrollDirection,
  amount: number,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (
    await executeCommand('scroll', [direction, amount.toString(), '--json'], options)
  ).andThen((stdout) => validateOutput(stdout, SimpleActionOutputSchema, 'scroll'));
};

/**
 * 指定したセレクタの要素がビューポートに表示されるようにスクロールする
 *
 * @param selector - スクロール先のセレクタ
 * @param options - 実行オプション
 * @returns 成功時: SimpleActionOutput、失敗時: AgentBrowserError
 */
export const browserScrollIntoView = async (
  selector: Selector,
  options: ExecuteOptions = {},
): Promise<Result<SimpleActionOutput, AgentBrowserError>> => {
  return (await executeCommand('scrollintoview', [selector, '--json'], options)).andThen((stdout) =>
    validateOutput(stdout, SimpleActionOutputSchema, 'scrollintoview'),
  );
};
