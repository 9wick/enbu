/**
 * @packages/core
 *
 * フロー実行エンジンの公開API。
 * apps層（CLI、VSCode拡張）はorchestratorのみをインポートする。
 *
 * @remarks
 * 内部モジュール（executor, loader, parser, types）は直接エクスポートしない。
 * 必要な型・関数はorchestratorで re-export している。
 */

export {
  // メインAPI
  generateSessionNameFromPath,
  runFlows,
  // Parser関数
  getStepLineNumbers,
} from './orchestrator';

export type {
  // Orchestrator型
  FlowProgressCallback,
  FlowRunSummary,
  OrchestratorError,
  RunFlowsInput,
  RunFlowsOutput,
  // Executor型（コールバック用）
  StepCompletedProgress,
  StepProgress,
  // Types型（表示用）
  Command,
} from './orchestrator';
