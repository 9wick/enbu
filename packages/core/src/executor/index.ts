/**
 * @packages/core/executor
 *
 * フロー実行エンジンとコマンドハンドラを提供する。
 */

// 関数
export { executeFlow } from './flow-executor';

// 型
export type {
  FlowResult,
  StepResult,
  FlowExecutionOptions,
  ExecutionErrorType,
} from './result';
