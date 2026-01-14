import { spawn } from 'node:child_process';
import { type Result, err, ok } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions } from './types';

/** デフォルトタイムアウト: 30秒 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * agent-browserコマンドを実行する
 *
 * @param command - 実行するコマンド（例: "open", "click", "snapshot"）
 * @param args - コマンド引数（例: ["https://example.com"]）
 * @param options - 実行オプション
 * @returns 成功時: stdout文字列、失敗時: AgentBrowserError
 */
export const executeCommand = (
  command: string,
  args: readonly string[],
  options: ExecuteOptions = {},
): Promise<Result<string, AgentBrowserError>> => {
  const { sessionName, headed = false, timeoutMs = DEFAULT_TIMEOUT_MS, cwd } = options;

  return new Promise((resolve) => {
    // コマンドライン引数を構築
    const fullArgs = buildArgs(command, args, sessionName, headed);

    // プロセス起動
    const proc = spawn('npx', ['agent-browser', ...fullArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      cwd,
    });

    // 出力収集
    let stdout = '';
    let stderr = '';

    // 二重resolve防止フラグ
    let resolved = false;

    /**
     * 一度だけresolveを呼び出すラッパー
     * タイムアウト後のcloseイベントやerror後のcloseイベントで
     * 二重にresolveが呼ばれることを防ぐ
     */
    const resolveOnce = (result: Result<string, AgentBrowserError>): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // タイムアウト設定
    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolveOnce(
        err({
          type: 'timeout',
          command,
          args,
          timeoutMs,
        }),
      );
    }, timeoutMs);

    // 完了処理
    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolveOnce(ok(stdout));
      } else {
        // JSON出力からエラーメッセージを抽出試行
        const errorMessage = extractErrorMessage(stdout);

        resolveOnce(
          err({
            type: 'command_failed',
            command,
            args,
            exitCode: exitCode ?? 1,
            stderr,
            errorMessage,
          }),
        );
      }
    });

    // プロセス起動エラー
    proc.on('error', (error) => {
      resolveOnce(
        err({
          type: 'not_installed',
          message: `Failed to spawn agent-browser: ${error.message}`,
        }),
      );
    });
  });
};

/**
 * コマンドライン引数を構築する
 */
const buildArgs = (
  command: string,
  args: readonly string[],
  sessionName: string | undefined,
  headed: boolean,
): string[] => {
  const result: string[] = [command, ...args];

  if (sessionName !== undefined) {
    result.push('--session', sessionName);
  }

  if (headed) {
    result.push('--headed');
  }

  return result;
};

/**
 * オブジェクトかどうかを判定する型ガード
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * JSON出力からエラーメッセージを抽出する
 * パースに失敗した場合はnullを返す
 */
const extractErrorMessage = (stdout: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (isRecord(parsed)) {
      if (typeof parsed.error === 'string') {
        return parsed.error;
      }
      if (parsed.error === null) {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
};
