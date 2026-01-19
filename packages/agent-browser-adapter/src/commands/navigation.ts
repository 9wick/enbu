/**
 * ナビゲーション系コマンド
 *
 * ブラウザのURL移動に関するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions, Url } from '../types';
import type { OpenData } from '../schemas';
import { OpenDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * 指定したURLをブラウザで開く
 *
 * agent-browser の open コマンドを実行し、結果をvalibotで検証して返す。
 *
 * @param url - 開くURL
 * @param options - 実行オプション
 * @returns 成功時: OpenData、失敗時: AgentBrowserError
 */
export const browserOpen = async (
  url: Url,
  options: ExecuteOptions = {},
): Promise<Result<OpenData, AgentBrowserError>> => {
  return (await executeCommand('open', [url, '--json'], options)).andThen((stdout) =>
    validateAndExtractData(stdout, OpenDataSchema, 'open'),
  );
};
