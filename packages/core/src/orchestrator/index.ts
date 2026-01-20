/**
 * オーケストレーター層のエクスポート
 *
 * フロー実行パイプライン全体を管理するための型と関数を提供する。
 * apps層（CLI、VSCode拡張）はこのモジュールのみをインポートする。
 */

// === メインAPI ===
export { runFlows } from './run-flows';

// === Orchestrator固有の型 ===
export type {
  FlowProgressCallback,
  FlowRunSummary,
  OrchestratorError,
  RunFlowsInput,
  RunFlowsOutput,
} from './types';

// === apps層が必要なExecutor型（re-export） ===
export type { StepCompletedProgress, StepProgress } from '../executor';

// === apps層が必要なTypes型（re-export） ===
export type { Command } from '../types';

// === apps層が必要なParser関数（re-export） ===
export { getStepLineNumbers } from '../parser';
