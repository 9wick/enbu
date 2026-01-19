/**
 * cleanupコマンドの実装
 *
 * enbu-* プレフィックスを持つagent-browserセッションを一括クリーンアップする。
 * 他のプロジェクトのセッション（enbu-以外のプレフィックス）は残す。
 */

import { type Result, ok, err, fromThrowable } from 'neverthrow';
import { spawn } from 'node:child_process';
import type { CliError } from '../types';
import { OutputFormatter } from '../output/formatter';

/**
 * cleanupコマンドの引数
 */
type CleanupCommandArgs = {
  /** verboseモード */
  verbose: boolean;
};

/**
 * セッションのクリーンアップ結果
 */
type CleanupResult = {
  /** 成功したセッション数 */
  succeeded: number;
  /** 失敗したセッション数 */
  failed: number;
  /** クリーンアップ対象のセッション総数 */
  total: number;
};

/**
 * agent-browser session list --json の出力型
 */
type SessionListResponse = {
  success: boolean;
  data: {
    sessions: string[];
  };
};

/**
 * コマンドを実行して標準出力を取得する
 *
 * @param command - 実行するコマンド
 * @param args - コマンドの引数
 * @returns 標準出力の文字列
 */
const execCommand = (command: string, args: string[]): Promise<Result<string, CliError>> => {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(ok(stdout));
      } else {
        resolve(
          err({
            type: 'execution_error' as const,
            message: `Command failed with code ${code}: ${stderr}`,
          }),
        );
      }
    });

    proc.on('error', (error) => {
      resolve(
        err({
          type: 'execution_error' as const,
          message: `Failed to spawn command: ${error.message}`,
        }),
      );
    });
  });
};

/**
 * JSONパースエラーをCliErrorに変換する
 */
const toParseError = (error: unknown): CliError => ({
  type: 'execution_error',
  message: `Failed to parse session list JSON: ${error}`,
});

/**
 * JSON文字列をSessionListResponseとしてパースする
 */
const parseSessionListJson = fromThrowable(
  (json: string): SessionListResponse => JSON.parse(json),
  toParseError,
);

/**
 * SessionListResponseからセッション配列を抽出する
 */
const extractSessions = (response: SessionListResponse): Result<string[], CliError> => {
  if (!response.success) {
    const error: CliError = {
      type: 'execution_error',
      message: 'agent-browser session list returned success: false',
    };
    return err(error);
  }
  return ok(response.data.sessions);
};

/**
 * agent-browser session list --json を実行してセッション一覧を取得する
 *
 * @returns 成功時: 全セッション名の配列、失敗時: CliError
 */
const listAllSessions = async (): Promise<Result<string[], CliError>> => {
  const result = await execCommand('npx', ['agent-browser', 'session', 'list', '--json']);

  return result.andThen(parseSessionListJson).andThen(extractSessions);
};

/**
 * enbu-* プレフィックスを持つセッションのみをフィルタリングする
 *
 * @param sessions - 全セッション名の配列
 * @returns enbu-プレフィックスを持つセッション名の配列
 */
const filterEnbuSessions = (sessions: string[]): string[] => {
  return sessions.filter((session) => session.startsWith('enbu-'));
};

/**
 * 単一のセッションをクローズする
 *
 * npx agent-browser --session <name> close を実行してセッションを終了する。
 *
 * @param sessionName - クローズするセッション名
 * @param formatter - 出力フォーマッター
 * @returns セッションのクローズに成功した場合はtrue、失敗した場合はfalse
 */
const cleanupSession = async (
  sessionName: string,
  formatter: OutputFormatter,
): Promise<boolean> => {
  const result = await execCommand('npx', ['agent-browser', '--session', sessionName, 'close']);

  return result.match(
    () => {
      formatter.success(sessionName);
      return true;
    },
    (error) => {
      formatter.failure(`${sessionName} (${error.message})`);
      return false;
    },
  );
};

/**
 * 全てのenbu-セッションをクリーンアップする
 *
 * 各セッションに対してcloseコマンドを実行し、成功・失敗の数を集計する。
 * エラーが発生したセッションがあっても処理を継続し、可能な限り多くのセッションをクリーンアップする。
 *
 * @param sessions - クリーンアップ対象のセッション名配列
 * @param formatter - 出力フォーマッター
 * @returns クリーンアップ結果（成功数、失敗数、総数）
 */
const cleanupAllSessions = async (
  sessions: string[],
  formatter: OutputFormatter,
): Promise<CleanupResult> => {
  let succeeded = 0;
  let failed = 0;

  for (const sessionName of sessions) {
    const success = await cleanupSession(sessionName, formatter);
    if (success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    succeeded,
    failed,
    total: sessions.length,
  };
};

/**
 * cleanupコマンドを実行する
 *
 * enbu-* プレフィックスを持つagent-browserセッションを一括クリーンアップする。
 * 以下の処理を順次実行する:
 * 1. npx agent-browser session list --json でセッション一覧を取得
 * 2. enbu-* プレフィックスでフィルタリング
 * 3. 各セッションに対して npx agent-browser --session <name> close を実行
 * 4. 成功・失敗の数を集計して表示
 *
 * @param args - cleanupコマンドの引数
 * @returns 成功時: void、失敗時: CliError
 */
export const runCleanupCommand = async (
  args: CleanupCommandArgs,
): Promise<Result<void, CliError>> => {
  const formatter = new OutputFormatter(args.verbose);

  formatter.info('Cleaning up enbu sessions...');
  formatter.newline();

  // 1. 全セッションを取得
  const allSessionsResult = await listAllSessions();
  if (allSessionsResult.isErr()) {
    formatter.error(`Failed to list sessions: ${allSessionsResult.error.message}`);
    return err(allSessionsResult.error);
  }

  // 2. enbu-セッションのみをフィルタリング
  const enbuSessions = filterEnbuSessions(allSessionsResult.value);

  // クリーンアップ対象のセッションがない場合
  if (enbuSessions.length === 0) {
    formatter.info('No enbu sessions found');
    return ok(undefined);
  }

  formatter.debug(`Found ${enbuSessions.length} enbu session(s)`);

  // 3. 各セッションをクリーンアップ
  const result = await cleanupAllSessions(enbuSessions, formatter);

  // 4. サマリーを表示
  formatter.newline();
  if (result.failed === 0) {
    formatter.info(`Cleaned up ${result.succeeded} session(s)`);
  } else {
    formatter.info(`Cleaned up ${result.succeeded} session(s) (${result.failed} failed)`);
  }

  return ok(undefined);
};
