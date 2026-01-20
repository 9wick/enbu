/**
 * @packages/core/executor
 *
 * フロー実行エンジンとコマンドハンドラを提供する。
 */

// 関数
export { executeFlow } from './flow-executor';

// 型ガード関数
export {
  isPassedStepResult,
  isFailedStepResult,
  isPassedFlowResult,
  isFailedFlowResult,
} from './result';

// 型
export type {
  FlowResult,
  PassedFlowResult,
  FailedFlowResult,
  StepResult,
  PassedStepResult,
  FailedStepResult,
  FlowExecutionOptions,
  ExecutionErrorType,
  StepProgress,
  StepProgressCallback,
} from './result';
