/**
 * @apps/cli の型定義
 */

/**
 * パース済みCLI引数
 *
 * CLIから受け取った引数を解析した結果を表す型。
 * コマンドタイプ（init または run）によって異なるプロパティを持つ。
 */
export type ParsedArgs = {
  /** 実行するコマンド */
  command: 'init' | 'run';
  /** ヘルプメッセージを表示するかどうか */
  help: boolean;
  /** バージョン情報を表示するかどうか */
  version: boolean;
  /** 詳細なログ出力を行うかどうか */
  verbose: boolean;
} & (
  | {
      /** initコマンドの引数 */
      command: 'init';
      /** 既存ファイルを強制的に上書きするかどうか */
      force: boolean;
    }
  | {
      /** runコマンドの引数 */
      command: 'run';
      /** 実行対象のフローファイルパス一覧 */
      files: string[];
      /** ブラウザをヘッドレスモードで実行しない（画面表示する）かどうか */
      headed: boolean;
      /** フロー実行時に利用する環境変数 */
      env: Record<string, string>;
      /** タイムアウト時間（ミリ秒） */
      timeout: number;
      /** 失敗時にスクリーンショットを保存するかどうか */
      screenshot: boolean;
      /** 最初の失敗で実行を中断するかどうか */
      bail: boolean;
      /** agent-browserのセッション名（省略可） */
      session?: string;
      /** 進捗をJSON形式で出力するか（VS Code拡張など外部ツール連携用） */
      progressJson: boolean;
    }
);

/**
 * CLI実行エラー型
 *
 * CLIの実行中に発生しうるエラーを表す型。
 * エラータイプによって適切なハンドリングを行う。
 */
export type CliError =
  | {
      /** 引数が不正な場合のエラー */
      type: 'invalid_args';
      /** エラーメッセージ */
      message: string;
    }
  | {
      /** 実行時エラー（agent-browser未インストール、ファイル読み込み失敗等） */
      type: 'execution_error';
      /** エラーメッセージ */
      message: string;
      /** 元となったエラー（省略可） */
      cause?: unknown;
    };

/**
 * フロー実行結果
 *
 * 複数のフローファイルを実行した結果のサマリーを表す型。
 */
export type FlowExecutionResult = {
  /** 成功したフロー数 */
  passed: number;
  /** 失敗したフロー数 */
  failed: number;
  /** 実行したフロー総数 */
  total: number;
};

/**
 * 出力先（stdout / stderr）
 *
 * メッセージの出力先を指定する型。
 * 通常メッセージはstdout、エラーメッセージはstderrに出力する。
 */
export type OutputTarget = 'stdout' | 'stderr';

/**
 * ログレベル
 *
 * ログメッセージの重要度を表す型。
 * verboseモード時にはdebugレベルのログも出力される。
 */
export type LogLevel = 'info' | 'error' | 'debug';
