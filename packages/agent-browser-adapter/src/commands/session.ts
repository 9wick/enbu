/**
 * セッション管理コマンド
 *
 * ブラウザセッションの管理に関するコマンドを提供する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError } from '../types';
import type { CloseOutput } from '../schemas';
import { CloseOutputSchema } from '../schemas';
import { executeCommand } from '../executor';
import { validateOutput } from '../validator';

/**
 * ブラウザセッションをクローズする
 *
 * @param sessionName - クローズするセッション名
 * @returns 成功時: CloseOutput、失敗時: AgentBrowserError
 */
export const browserClose = async (
  sessionName: string,
): Promise<Result<CloseOutput, AgentBrowserError>> => {
  return (await executeCommand('close', ['--json'], { sessionName })).andThen((stdout) =>
    validateOutput(stdout, CloseOutputSchema, 'close'),
  );
};
