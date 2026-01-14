import { spawn } from 'node:child_process';
import { type Result, err, ok } from 'neverthrow';
import type { AgentBrowserError } from './types';

/**
 * agent-browserがインストールされているか確認する
 *
 * `npx agent-browser --help` を実行し、exitCode で判定する。
 * - exitCode 0 → ok("agent-browser is installed")
 * - exitCode !== 0 または ENOENT → err({ type: 'not_installed', ... })
 *
 * @returns agent-browserがインストールされている場合は成功メッセージ、インストールされていない場合はエラー
 */
export const checkAgentBrowser = (): Promise<Result<string, AgentBrowserError>> => {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['agent-browser', '--help'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true, // Windows対応のため
    });

    proc.on('error', (error) => {
      // ENOENT: コマンドが見つからない
      resolve(
        err({
          type: 'not_installed',
          message: `agent-browser is not installed: ${error.message}`,
        }),
      );
    });

    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(ok('agent-browser is installed'));
      } else {
        resolve(
          err({
            type: 'not_installed',
            message: `agent-browser check failed with exit code ${exitCode}`,
          }),
        );
      }
    });
  });
};
