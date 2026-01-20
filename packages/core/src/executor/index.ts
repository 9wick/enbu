/**
 * @packages/core/executor
 *
 * フロー実行エンジンとコマンドハンドラを提供する。
 */

// 関数
export { executeFlow } from './flow-executor';
// 型
export type {
  ExecutionErrorType,
  FailedFlowResult,
  FailedStepResult,
  FlowExecutionOptions,
  FlowResult,
  NoCallback,
  PassedFlowResult,
  PassedStepResult,
  StepCompletedProgress,
  StepProgress,
  StepProgressCallback,
  StepResult,
  StepStartedProgress,
} from './result';
// 定数
export { NO_CALLBACK } from './result';
// 型ガード関数
export {
  isFailedFlowResult,
  isFailedStepResult,
  isPassedFlowResult,
  isPassedStepResult,
} from './result';
// ScreenshotResult型
export type { ScreenshotResult } from './result';
