import type { Result } from 'neverthrow';
import { executeCommand } from './executor';
import type { AgentBrowserError } from './types';

/**
 * agent-browserのセッションをクローズする
 *
 * 指定されたセッション名のブラウザセッションを終了します。
 * セッションが存在しない場合や、クローズに失敗した場合はエラーを返します。
 *
 * @param sessionName - クローズするセッションの名前
 * @returns 成功時: void、失敗時: AgentBrowserError
 */
export const closeSession = async (
  sessionName: string,
): Promise<Result<void, AgentBrowserError>> => {
  const result = await executeCommand('close', [], { sessionName });
  return result.map(() => undefined);
};
