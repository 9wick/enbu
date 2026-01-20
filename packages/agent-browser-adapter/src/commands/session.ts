/**
 * セッション管理コマンド
 *
 * ブラウザセッションの管理に関するコマンドを提供する。
 */

import { type ResultAsync } from 'neverthrow';
import type { AgentBrowserError } from '../types';
import type { EmptyData } from '../schemas';
import { EmptyDataSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateAndExtractData } from '../validator';

/**
 * ブラウザセッションをクローズする
 *
 * @param sessionName - クローズするセッション名
 * @returns 成功時: EmptyData、失敗時: AgentBrowserError
 */
export const browserClose = (sessionName: string): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('close', ['--json'], { sessionName }).andThen((stdout) =>
    validateAndExtractData(stdout, EmptyDataSchema, 'close'),
  );
