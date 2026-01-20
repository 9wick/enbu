/**
 * @packages/core
 *
 * フロー定義の型システム、パーサー、ローダー、実行エンジンを提供する。
 */

// 型
export type {
  Flow,
  FlowEnv,
  Command,
  OpenCommand,
  ClickCommand,
  TypeCommand,
  FillCommand,
  PressCommand,
  HoverCommand,
  SelectCommand,
  ScrollCommand,
  ScrollIntoViewCommand,
  WaitCommand,
  ScreenshotCommand,
  SnapshotCommand,
  EvalCommand,
  AssertVisibleCommand,
  AssertEnabledCommand,
  AssertCheckedCommand,
  ParseError,
} from './types';

// Executor型
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
} from './executor';

// 関数
export { parseFlowYaml, resolveEnvVariables, getStepLineNumbers } from './parser';
export { loadFlows } from './loader';
export {
  executeFlow,
  isPassedStepResult,
  isFailedStepResult,
  isPassedFlowResult,
  isFailedFlowResult,
} from './executor';
