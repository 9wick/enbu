/**
 * 進捗JSON型定義
 *
 * CLIの --progress-json オプションで出力されるJSON形式のメッセージ型定義。
 * VS Code拡張機能はこれらのメッセージを解析してデコレーションを更新する。
 */

/**
 * フロー開始メッセージ
 *
 * フローの実行が開始されたときに送信される。
 */
export type FlowStartMessage = {
  type: 'flow:start';
  /** フロー名 */
  flowName: string;
  /** ステップの総数 */
  stepTotal: number;
};

/**
 * ステップ開始メッセージ
 *
 * 各ステップの実行が開始されたときに送信される。
 */
export type StepStartMessage = {
  type: 'step:start';
  /** ステップインデックス（0始まり） */
  stepIndex: number;
  /** ステップの総数 */
  stepTotal: number;
};

/**
 * ステップ完了メッセージ
 *
 * 各ステップの実行が完了したときに送信される（成功・失敗を問わず）。
 */
export type StepCompleteMessage = {
  type: 'step:complete';
  /** ステップインデックス（0始まり） */
  stepIndex: number;
  /** ステップの総数 */
  stepTotal: number;
  /** ステップの実行結果 */
  status: 'passed' | 'failed';
  /** 実行時間（ミリ秒） */
  duration: number;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
};

/**
 * フロー完了メッセージ
 *
 * フローの実行が完了したときに送信される（成功・失敗を問わず）。
 */
export type FlowCompleteMessage = {
  type: 'flow:complete';
  /** フロー名 */
  flowName: string;
  /** フロー全体の実行結果 */
  status: 'passed' | 'failed';
  /** 実行時間（ミリ秒） */
  duration: number;
};

/**
 * 進捗JSONメッセージの共用体型
 *
 * CLIから出力される全ての進捗メッセージの型。
 */
export type ProgressMessage =
  | FlowStartMessage
  | StepStartMessage
  | StepCompleteMessage
  | FlowCompleteMessage;
