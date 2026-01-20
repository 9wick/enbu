/**
 * executor の型定義
 */

import type { ResultAsync } from 'neverthrow';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { Command, Flow } from '../types';

// ==========================================
// Core層のエラー型定義
// ==========================================

/**
 * アサーション失敗エラー
 *
 * assertVisible, assertNotVisible, assertEnabled, assertChecked などの
 * アサーションコマンドで条件が満たされなかった場合に発生する。
 */
export type AssertionFailedError = {
  /** エラー種別: アサーション失敗 */
  type: 'assertion_failed';
  /** エラーメッセージ（アサーション内容を説明） */
  message: string;
  /** アサーションコマンド名 */
  command: string;
  /** 検証したセレクタ */
  selector: string;
  /** 期待値 */
  expected: unknown;
  /** 実際の値 */
  actual: unknown;
};

/**
 * Core層で発生するエラー
 *
 * AgentBrowserErrorとは別に、コマンド実行ロジックで発生するエラー。
 */
export type CoreError = AssertionFailedError;

/**
 * コマンド実行で発生しうるすべてのエラー
 *
 * adapter層のエラーとcore層のエラーを含む。
 */
export type ExecutorError = AgentBrowserError | CoreError;

/**
 * 実行エラーの種別
 *
 * StepResultのerror.typeで使用される。
 */
export type ExecutionErrorType =
  | 'not_installed' // agent-browserがインストールされていない
  | 'command_failed' // プロセスが非0終了
  | 'command_execution_failed' // success:falseが返された
  | 'timeout' // タイムアウト
  | 'parse_error' // レスポンスのパースに失敗
  | 'assertion_failed' // アサーションが失敗
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
 * 成功したステップの実行結果
 */
export type PassedStepResult = {
  /** ステップのインデックス（0始まり） */
  index: number;
  /** 実行したコマンド */
  command: Command;
  /** 実行ステータス: 成功 */
  status: 'passed';
  /** 実行時間（ミリ秒） */
  duration: number;
  /** 標準出力（コマンドが出力を返す場合） */
  stdout?: string;
};

/**
 * 失敗したステップの実行結果
 */
export type FailedStepResult = {
  /** ステップのインデックス（0始まり） */
  index: number;
  /** 実行したコマンド */
  command: Command;
  /** 実行ステータス: 失敗 */
  status: 'failed';
  /** 実行時間（ミリ秒） */
  duration: number;
  /** エラー情報（失敗時は必須） */
  error: {
    /** エラーメッセージ */
    message: string;
    /** エラーの種別 */
    type: ExecutionErrorType;
    /** スクリーンショットのパス（撮影された場合） */
    screenshot?: string;
  };
};

/**
 * 各ステップの実行結果
 *
 * PassedStepResultまたはFailedStepResultのいずれかの型を持つ。
 * status='passed'の場合はerrorフィールドは存在せず、
 * status='failed'の場合はerrorフィールドが必須となる。
 */
export type StepResult = PassedStepResult | FailedStepResult;

/**
 * 成功したフロー全体の実行結果
 */
export type PassedFlowResult = {
  /** 実行したフロー */
  flow: Flow;
  /** セッション名 */
  sessionName: string;
  /** 全体の実行ステータス: 成功 */
  status: 'passed';
  /** 全体の実行時間（ミリ秒） */
  duration: number;
  /** 各ステップの実行結果 */
  steps: StepResult[];
};

/**
 * 失敗したフロー全体の実行結果
 */
export type FailedFlowResult = {
  /** 実行したフロー */
  flow: Flow;
  /** セッション名 */
  sessionName: string;
  /** 全体の実行ステータス: 失敗 */
  status: 'failed';
  /** 全体の実行時間（ミリ秒） */
  duration: number;
  /** 各ステップの実行結果 */
  steps: StepResult[];
  /** エラー情報（失敗時は必須） */
  error: {
    /** エラーメッセージ */
    message: string;
    /** エラーが発生したステップのインデックス */
    stepIndex: number;
    /** スクリーンショットのパス（撮影された場合） */
    screenshot?: string;
  };
};

/**
 * フロー全体の実行結果
 *
 * PassedFlowResultまたはFailedFlowResultのいずれかの型を持つ。
 * status='passed'の場合はerrorフィールドは存在せず、
 * status='failed'の場合はerrorフィールドが必須となる。
 */
export type FlowResult = PassedFlowResult | FailedFlowResult;

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
) => ResultAsync<CommandResult, ExecutorError>;

// ==========================================
// 型ガード関数
// ==========================================

/**
 * StepResultが成功したステップかどうかを判定する型ガード関数
 *
 * @param result - 判定対象のStepResult
 * @returns 成功したステップの場合はtrue、失敗したステップの場合はfalse
 *
 * @example
 * ```typescript
 * if (isPassedStepResult(stepResult)) {
 *   // stepResult.errorは存在しない
 *   console.log(stepResult.stdout);
 * }
 * ```
 */
export const isPassedStepResult = (result: StepResult): result is PassedStepResult => {
  return result.status === 'passed';
};

/**
 * StepResultが失敗したステップかどうかを判定する型ガード関数
 *
 * @param result - 判定対象のStepResult
 * @returns 失敗したステップの場合はtrue、成功したステップの場合はfalse
 *
 * @example
 * ```typescript
 * if (isFailedStepResult(stepResult)) {
 *   // stepResult.errorは必ず存在する
 *   console.log(stepResult.error.message);
 * }
 * ```
 */
export const isFailedStepResult = (result: StepResult): result is FailedStepResult => {
  return result.status === 'failed';
};

/**
 * FlowResultが成功したフローかどうかを判定する型ガード関数
 *
 * @param result - 判定対象のFlowResult
 * @returns 成功したフローの場合はtrue、失敗したフローの場合はfalse
 *
 * @example
 * ```typescript
 * if (isPassedFlowResult(flowResult)) {
 *   // flowResult.errorは存在しない
 *   console.log(`All ${flowResult.steps.length} steps passed`);
 * }
 * ```
 */
export const isPassedFlowResult = (result: FlowResult): result is PassedFlowResult => {
  return result.status === 'passed';
};

/**
 * FlowResultが失敗したフローかどうかを判定する型ガード関数
 *
 * @param result - 判定対象のFlowResult
 * @returns 失敗したフローの場合はtrue、成功したフローの場合はfalse
 *
 * @example
 * ```typescript
 * if (isFailedFlowResult(flowResult)) {
 *   // flowResult.errorは必ず存在する
 *   console.log(`Failed at step ${flowResult.error.stepIndex}: ${flowResult.error.message}`);
 * }
 * ```
 */
export const isFailedFlowResult = (result: FlowResult): result is FailedFlowResult => {
  return result.status === 'failed';
};
