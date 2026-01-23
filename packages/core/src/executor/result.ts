/**
 * executor の型定義
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { ResultAsync } from 'neverthrow';
import type { Command, Flow, ResolvedCommand } from '../types';

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
type CoreError = AssertionFailedError;

/**
 * コマンド実行で発生しうるすべてのエラー
 *
 * adapter層のエラーとcore層のエラーを含む。
 */
export type ExecutorError = AgentBrowserError | CoreError;

/**
 * エラー時スクリーンショットの撮影結果
 *
 * スクリーンショット撮影の3つの状態を型で明示的に表現する:
 * - captured: 撮影成功（パスを含む）
 * - failed: 撮影失敗（失敗理由を含む）
 * - disabled: 撮影が無効化されている（オプションでOFFの場合）
 */
export type ScreenshotResult =
  | {
      /** 撮影状態: 成功 */
      status: 'captured';
      /** スクリーンショットのファイルパス */
      path: string;
    }
  | {
      /** 撮影状態: 失敗 */
      status: 'failed';
      /** 撮影失敗の理由 */
      reason: string;
    }
  | {
      /** 撮影状態: 無効 */
      status: 'disabled';
    };

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
 * ステップ開始時の進捗情報
 */
export type StepStartedProgress = {
  /** ステップのインデックス（0始まり） */
  stepIndex: number;
  /** 全ステップ数 */
  stepTotal: number;
  /** 進捗ステータス: 開始 */
  status: 'started';
};

/**
 * ステップ完了時の進捗情報
 */
export type StepCompletedProgress = {
  /** ステップのインデックス（0始まり） */
  stepIndex: number;
  /** 全ステップ数 */
  stepTotal: number;
  /** 進捗ステータス: 完了 */
  status: 'completed';
  /** ステップ結果（完了時は必須） */
  stepResult: StepResult;
};

/**
 * ステップ進捗コールバックに渡される情報
 *
 * タグ付きユニオン型: statusの値によってstepResultの存在が決定される。
 * - status='started': stepResultは存在しない
 * - status='completed': stepResultは必須
 */
export type StepProgress = StepStartedProgress | StepCompletedProgress;

/**
 * ステップ進捗コールバック関数の型
 *
 * 各ステップの開始時・完了時に呼び出されるコールバック。
 * リアルタイムな進捗表示（VS Code拡張など）で使用する。
 */
export type StepProgressCallback = (progress: StepProgress) => void | Promise<void>;

/**
 * コールバックなし定数
 *
 * onStepProgressが不要な場合に使用する。
 * 型と値を同時に定義することで、as による型アサーションを回避する。
 */
export const NO_CALLBACK = { _brand: 'NoCallback' } as const;

/**
 * コールバックなしを示す型
 */
export type NoCallback = typeof NO_CALLBACK;

/**
 * セッション指定の型
 *
 * セッションの指定方法を明示的に表現する:
 * - name: 完全なセッション名を指定（そのまま使用）
 * - prefix: プレフィックスを指定（{prefix}-timestamp-random 形式で生成）
 * - default: デフォルトのプレフィックス 'enbu' を使用
 */
export type SessionSpec =
  | { type: 'name'; value: string }
  | { type: 'prefix'; value: string }
  | { type: 'default' };

/**
 * フロー実行時のオプション
 *
 * Domain層では全てのオプションを必須とし、曖昧さを排除する。
 * デフォルト値の補完はUsecase層（CLI、VSCode拡張など）で行う。
 */
export type FlowExecutionOptions = {
  /** セッション指定 */
  session: SessionSpec;
  /** ヘッドモードで実行するか */
  headed: boolean;
  /** 環境変数のマップ */
  env: Record<string, string>;
  /** 自動待機のタイムアウト時間（ミリ秒） */
  autoWaitTimeoutMs: number;
  /** 自動待機のポーリング間隔（ミリ秒） */
  autoWaitIntervalMs: number;
  /** コマンド実行のタイムアウト時間（ミリ秒） */
  commandTimeoutMs: number;
  /** 作業ディレクトリ */
  cwd: string;
  /** スクリーンショットを撮影するか */
  screenshot: boolean;
  /** エラー時に即座に停止するか */
  bail: boolean;
  /** ステップ進捗コールバック（各ステップの開始・完了時に呼び出される） */
  onStepProgress: StepProgressCallback | NoCallback;
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
  /** コマンドの標準出力（JSON文字列） */
  stdout: string;
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
    /** スクリーンショット撮影結果 */
    screenshot: ScreenshotResult;
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
    /** スクリーンショット撮影結果 */
    screenshot: ScreenshotResult;
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
    cwd: string;
  };
  /** 環境変数のマップ */
  env: Record<string, string>;
  /** 自動待機のタイムアウト時間（ミリ秒） */
  autoWaitTimeoutMs: number;
  /** 自動待機のポーリング間隔（ミリ秒） */
  autoWaitIntervalMs: number;
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
 * ResolvedCommand（セレクタ解決済みコマンド）を受け取り、
 * 実行コンテキストを使用してコマンドを実行し、
 * 実行結果またはエラーを返す。
 *
 * @template T - ResolvedCommand型またはそのサブタイプ
 */
export type CommandHandler<T extends ResolvedCommand> = (
  command: T,
  context: ExecutionContext,
) => ResultAsync<CommandResult, ExecutorError>;

// ==========================================
// 型ガード関数
// ==========================================

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
 *   // flowResult.errorとflowResult.sessionNameは必ず存在する
 *   console.log(`Flow failed at step ${flowResult.error.stepIndex}`);
 * }
 * ```
 */
export const isFailedFlowResult = (result: FlowResult): result is FailedFlowResult => {
  return result.status === 'failed';
};
