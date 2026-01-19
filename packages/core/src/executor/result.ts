/**
 * executor の型定義
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { Command, Flow } from '../types';

/**
 * 実行エラーの種別
 */
export type ExecutionErrorType =
  | 'not_installed' // agent-browserがインストールされていない
  | 'command_failed' // コマンド実行が失敗
  | 'timeout' // タイムアウト
  | 'parse_error' // レスポンスのパースに失敗
  | 'assertion_failed' // アサーションが失敗
  | 'validation_error' // バリデーションエラー
  | 'agent_browser_output_parse_error' // agent-browserの出力JSONのパース・検証に失敗
  | 'brand_validation_error'; // Brand型の検証に失敗（空文字列など）

/**
 * ステップ進捗コールバックに渡される情報
 */
export type StepProgress = {
  /** ステップのインデックス（0始まり） */
  stepIndex: number;
  /** 全ステップ数 */
  stepTotal: number;
  /** 進捗ステータス */
  status: 'started' | 'completed';
  /** ステップ結果（completedの場合のみ） */
  stepResult?: StepResult;
};

/**
 * ステップ進捗コールバック関数の型
 *
 * 各ステップの開始時・完了時に呼び出されるコールバック。
 * リアルタイムな進捗表示（VS Code拡張など）で使用する。
 */
export type StepProgressCallback = (progress: StepProgress) => void | Promise<void>;

/**
 * フロー実行時のオプション
 */
export type FlowExecutionOptions = {
  /** セッション名 */
  sessionName: string;
  /** ヘッドモードで実行するか（デフォルト: false） */
  headed?: boolean;
  /** 環境変数のマップ */
  env?: Record<string, string>;
  /** 自動待機のタイムアウト時間（ミリ秒） */
  autoWaitTimeoutMs?: number;
  /** 自動待機のポーリング間隔（ミリ秒） */
  autoWaitIntervalMs?: number;
  /** コマンド実行のタイムアウト時間（ミリ秒） */
  commandTimeoutMs?: number;
  /** 作業ディレクトリ */
  cwd?: string;
  /** スクリーンショットを撮影するか（デフォルト: false） */
  screenshot?: boolean;
  /** エラー時に即座に停止するか（デフォルト: true） */
  bail?: boolean;
  /** ステップ進捗コールバック（各ステップの開始・完了時に呼び出される） */
  onStepProgress?: StepProgressCallback;
};

/**
 * 各ステップの実行結果
 */
export type StepResult = {
  /** ステップのインデックス（0始まり） */
  index: number;
  /** 実行したコマンド */
  command: Command;
  /** 実行ステータス */
  status: 'passed' | 'failed';
  /** 実行時間（ミリ秒） */
  duration: number;
  /** 標準出力（コマンドが出力を返す場合） */
  stdout?: string;
  /** エラー情報（失敗時のみ） */
  error?: {
    /** エラーメッセージ */
    message: string;
    /** エラーの種別 */
    type: ExecutionErrorType;
    /** スクリーンショットのパス（撮影された場合） */
    screenshot?: string;
  };
};

/**
 * フロー全体の実行結果
 */
export type FlowResult = {
  /** 実行したフロー */
  flow: Flow;
  /** セッション名 */
  sessionName: string;
  /** 全体の実行ステータス */
  status: 'passed' | 'failed';
  /** 全体の実行時間（ミリ秒） */
  duration: number;
  /** 各ステップの実行結果 */
  steps: StepResult[];
  /** エラー情報（失敗時のみ） */
  error?: {
    /** エラーメッセージ */
    message: string;
    /** エラーが発生したステップのインデックス */
    stepIndex: number;
    /** スクリーンショットのパス（撮影された場合） */
    screenshot?: string;
  };
};

/**
 * コマンド実行のコンテキスト（内部使用）
 *
 * executeFlowの実行中に使用される内部コンテキスト情報。
 * 各コマンドの実行時に必要な設定をまとめたもの。
 */
export type ExecutionContext = {
  /** セッション名 */
  sessionName: string;
  /** コマンド実行時のオプション */
  executeOptions: {
    /** セッション名 */
    sessionName: string;
    /** ヘッドモードで実行するか */
    headed: boolean;
    /** タイムアウト時間（ミリ秒） */
    timeoutMs: number;
    /** 作業ディレクトリ */
    cwd?: string;
  };
  /** 環境変数のマップ */
  env: Record<string, string>;
  /** 自動待機のタイムアウト時間（ミリ秒） */
  autoWaitTimeoutMs: number;
  /** 自動待機のポーリング間隔（ミリ秒） */
  autoWaitIntervalMs: number;
  /**
   * autoWaitで解決されたref形式のセレクタ（例: "@e1"）
   * テキストセレクタをagent-browser内部のref形式に変換したもの。
   * コマンドハンドラはセレクタを使用する際、このrefを優先して使用すべき。
   */
  resolvedRef?: string;
};

/**
 * コマンド実行結果（内部使用）
 *
 * 個別のコマンド実行から返される内部的な結果。
 * StepResultを構築する際の中間データとして使用される。
 */
export type CommandResult = {
  /** コマンドの標準出力 */
  stdout: string;
  /** コマンドの実行時間（ミリ秒） */
  duration: number;
};

/**
 * コマンドハンドラ関数の型
 *
 * 各コマンドハンドラは、このシグネチャに従って実装される。
 * コマンドを受け取り、実行コンテキストを使用してコマンドを実行し、
 * 実行結果またはエラーを返す。
 *
 * @template T - Command型またはそのサブタイプ
 */
export type CommandHandler<T extends Command> = (
  command: T,
  context: ExecutionContext,
) => Promise<Result<CommandResult, AgentBrowserError>>;
