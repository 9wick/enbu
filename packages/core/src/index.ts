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
export type { FlowResult, StepResult, FlowExecutionOptions, ExecutionErrorType } from './executor';

// 関数
export { parseFlowYaml, resolveEnvVariables } from './parser';
export { loadFlows } from './loader';
export { executeFlow } from './executor';
