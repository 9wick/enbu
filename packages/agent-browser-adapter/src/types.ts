/**
 * agent-browser-adapter の型定義
 *
 * このファイルで定義される型は全て外部に公開される。
 * 内部でのみ使う型は各ファイル内で定義すること。
 */

/**
 * agent-browserのエラー型
 */
export type AgentBrowserError =
  | {
      type: 'not_installed';
      message: string;
    }
  | {
      type: 'command_failed';
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      errorMessage: string | null;
    }
  | {
      type: 'timeout';
      command: string;
      args: readonly string[];
      timeoutMs: number;
    }
  | {
      type: 'parse_error';
      message: string;
      rawOutput: string;
    };

/**
 * agent-browserの--json出力の共通構造
 */
export type AgentBrowserJsonOutput<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

/**
 * executeCommand のオプション
 */
export type ExecuteOptions = {
  sessionName?: string;
  headed?: boolean;
  timeoutMs?: number;
  cwd?: string;
};

/**
 * snapshot出力の要素参照
 */
export type SnapshotRef = {
  name: string;
  role: string;
};

/**
 * snapshot出力の参照マップ
 */
export type SnapshotRefs = Record<string, SnapshotRef>;
