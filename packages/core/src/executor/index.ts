/**
 * @packages/core/executor
 *
 * フロー実行エンジンとコマンドハンドラを提供する。
 */

// 関数
export { executeFlow } from './flow-executor';
// 型
export type {
  FlowExecutionOptions,
  StepCompletedProgress,
  StepProgress,
  StepProgressCallback,
  StepResult,
} from './result';
// 定数
export { NO_CALLBACK } from './result';
// ScreenshotResult型
export type { ScreenshotResult } from './result';
