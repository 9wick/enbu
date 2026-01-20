/**
 * runコマンドの実装
 *
 * フローファイルを読み込み、agent-browserで実行する。
 * 実行結果を表示し、終了コードを返す。
 */

import { ResultAsync } from 'neverthrow';
import { P, match } from 'ts-pattern';
import type { CliError, FlowExecutionResult } from '../types';
import type { OutputFormatter } from '../output/formatter';
import {
  runFlows,
  type RunFlowsInput,
  type RunFlowsOutput,
  type OrchestratorError,
  type FlowRunSummary,
  type FlowProgressCallback,
  type StepProgress,
  type StepCompletedProgress,
  type Command,
} from '@packages/core';

/**
 * runコマンドの引数
 */
type RunCommandArgs = {
  /** フローファイルパスの配列 */
  files: string[];
  /** ヘッドモードで実行するか */
  headed: boolean;
  /** 環境変数のマップ */
  env: Record<string, string>;
  /** タイムアウト時間（ミリ秒） */
  timeout: number;
  /** スクリーンショットを撮影するか */
  screenshot: boolean;
  /** セッション名 */
  session?: string;
  /** verboseモード */
  verbose: boolean;
  /** 進捗をJSON形式で出力するか */
  progressJson: boolean;
  /** 並列実行数（指定しない場合は順次実行） */
  parallel?: number;
};

/**
 * JSON進捗出力の型定義（VS Code拡張など外部ツール連携用）
 */
type ProgressJsonMessage =
  | { type: 'flow:start'; flowName: string; stepTotal: number }
  | { type: 'step:start'; stepIndex: number; stepTotal: number }
  | {
      type: 'step:complete';
      stepIndex: number;
      stepTotal: number;
      status: 'passed' | 'failed';
      duration: number;
      error?: string;
    }
  | { type: 'flow:complete'; flowName: string; status: 'passed' | 'failed'; duration: number };

/**
 * JSON進捗メッセージをstdoutに出力する
 *
 * @param message - 出力するメッセージ
 */
const outputProgressJson = (message: ProgressJsonMessage): void => {
  process.stdout.write(`${JSON.stringify(message)}\n`);
};

/**
 * コマンドの説明を生成する
 *
 * ts-patternで各コマンドの型を安全にマッチングし、説明文字列を生成する。
 *
 * @param command - コマンド
 * @returns コマンドの説明文字列
 */
const formatCommandDescription = (command: Command): string =>
  match(command)
    .with({ command: 'open', url: P.string }, (cmd) => `open ${cmd.url}`)
    .with({ command: 'click', css: P.string }, (cmd) => `click "${cmd.css}"`)
    .with({ command: 'click', ref: P.string }, (cmd) => `click ref:"${cmd.ref}"`)
    .with({ command: 'click', text: P.string }, (cmd) => `click text:"${cmd.text}"`)
    .with(
      { command: 'type', css: P.string, value: P.string },
      (cmd) => `type "${cmd.css}" = "${cmd.value}"`,
    )
    .with(
      { command: 'type', ref: P.string, value: P.string },
      (cmd) => `type ref:"${cmd.ref}" = "${cmd.value}"`,
    )
    .with(
      { command: 'type', text: P.string, value: P.string },
      (cmd) => `type text:"${cmd.text}" = "${cmd.value}"`,
    )
    .with(
      { command: 'fill', css: P.string, value: P.string },
      (cmd) => `fill "${cmd.css}" = "${cmd.value}"`,
    )
    .with(
      { command: 'fill', ref: P.string, value: P.string },
      (cmd) => `fill ref:"${cmd.ref}" = "${cmd.value}"`,
    )
    .with(
      { command: 'fill', text: P.string, value: P.string },
      (cmd) => `fill text:"${cmd.text}" = "${cmd.value}"`,
    )
    .with({ command: 'press', key: P.string }, (cmd) => `press ${cmd.key}`)
    .with({ command: 'hover', css: P.string }, (cmd) => `hover "${cmd.css}"`)
    .with({ command: 'hover', ref: P.string }, (cmd) => `hover ref:"${cmd.ref}"`)
    .with({ command: 'hover', text: P.string }, (cmd) => `hover text:"${cmd.text}"`)
    .with(
      { command: 'select', css: P.string, value: P.string },
      (cmd) => `select "${cmd.css}" = "${cmd.value}"`,
    )
    .with(
      { command: 'select', ref: P.string, value: P.string },
      (cmd) => `select ref:"${cmd.ref}" = "${cmd.value}"`,
    )
    .with(
      { command: 'select', text: P.string, value: P.string },
      (cmd) => `select text:"${cmd.text}" = "${cmd.value}"`,
    )
    .with(
      { command: 'scroll', direction: P.string, amount: P.number },
      (cmd) => `scroll ${cmd.direction} ${cmd.amount}px`,
    )
    .with({ command: 'scrollIntoView', css: P.string }, (cmd) => `scrollIntoView "${cmd.css}"`)
    .with({ command: 'scrollIntoView', ref: P.string }, (cmd) => `scrollIntoView ref:"${cmd.ref}"`)
    .with(
      { command: 'scrollIntoView', text: P.string },
      (cmd) => `scrollIntoView text:"${cmd.text}"`,
    )
    .with({ command: 'wait', ms: P.number }, (cmd) => `wait ${cmd.ms}ms`)
    .with({ command: 'wait', css: P.string }, (cmd) => `wait "${cmd.css}"`)
    .with({ command: 'wait', ref: P.string }, (cmd) => `wait ref:"${cmd.ref}"`)
    .with({ command: 'wait', text: P.string }, (cmd) => `wait text "${cmd.text}"`)
    .with({ command: 'wait', load: P.string }, (cmd) => `wait load ${cmd.load}`)
    .with({ command: 'wait', url: P.string }, (cmd) => `wait url "${cmd.url}"`)
    .with({ command: 'wait', fn: P.string }, (cmd) => `wait fn "${cmd.fn.substring(0, 30)}..."`)
    .with({ command: 'screenshot', path: P.string }, (cmd) => `screenshot ${cmd.path}`)
    .with({ command: 'snapshot' }, () => 'snapshot')
    .with(
      { command: 'eval', script: P.string },
      (cmd) => `eval "${cmd.script.substring(0, 50)}${cmd.script.length > 50 ? '...' : ''}"`,
    )
    .with({ command: 'assertVisible', css: P.string }, (cmd) => `assertVisible "${cmd.css}"`)
    .with({ command: 'assertVisible', ref: P.string }, (cmd) => `assertVisible ref:"${cmd.ref}"`)
    .with({ command: 'assertVisible', text: P.string }, (cmd) => `assertVisible text:"${cmd.text}"`)
    .with({ command: 'assertNotVisible', css: P.string }, (cmd) => `assertNotVisible "${cmd.css}"`)
    .with(
      { command: 'assertNotVisible', ref: P.string },
      (cmd) => `assertNotVisible ref:"${cmd.ref}"`,
    )
    .with(
      { command: 'assertNotVisible', text: P.string },
      (cmd) => `assertNotVisible text:"${cmd.text}"`,
    )
    .with({ command: 'assertEnabled', css: P.string }, (cmd) => `assertEnabled "${cmd.css}"`)
    .with({ command: 'assertEnabled', ref: P.string }, (cmd) => `assertEnabled ref:"${cmd.ref}"`)
    .with({ command: 'assertEnabled', text: P.string }, (cmd) => `assertEnabled text:"${cmd.text}"`)
    .with({ command: 'assertChecked', css: P.string }, (cmd) => `assertChecked "${cmd.css}"`)
    .with({ command: 'assertChecked', ref: P.string }, (cmd) => `assertChecked ref:"${cmd.ref}"`)
    .with({ command: 'assertChecked', text: P.string }, (cmd) => `assertChecked text:"${cmd.text}"`)
    .exhaustive();

/**
 * ステップ開始時のJSON進捗を出力する
 *
 * @param progress - ステップ進捗情報
 */
const outputStepStartJson = (progress: StepProgress): void => {
  outputProgressJson({
    type: 'step:start',
    stepIndex: progress.stepIndex,
    stepTotal: progress.stepTotal,
  });
};

/**
 * ステップ完了時のJSON進捗を出力する
 *
 * @param progress - ステップ完了進捗情報（stepResultが必ず存在する）
 */
const outputStepCompleteJson = (progress: StepCompletedProgress): void => {
  const stepResult = progress.stepResult;
  const errorMessage = stepResult.status === 'failed' ? stepResult.error.message : undefined;

  outputProgressJson({
    type: 'step:complete',
    stepIndex: progress.stepIndex,
    stepTotal: progress.stepTotal,
    status: stepResult.status,
    duration: stepResult.duration,
    error: errorMessage,
  });
};

/**
 * ステップ進捗コールバックを生成する（progressJsonモード用）
 *
 * @param progressJson - JSON進捗出力を有効にするか
 * @returns ステップ進捗コールバック（progressJson=falseの場合はundefined）
 */
const createStepProgressCallback = (
  progressJson: boolean,
): ((progress: StepProgress) => void) | undefined => {
  if (!progressJson) {
    return undefined;
  }

  return (progress: StepProgress): void => {
    if (progress.status === 'started') {
      outputStepStartJson(progress);
    } else {
      outputStepCompleteJson(progress);
    }
  };
};

/**
 * フロー進捗コールバックを生成する（progressJsonモード用）
 *
 * @param progressJson - JSON進捗出力を有効にするか
 * @returns フロー進捗コールバック（progressJson=falseの場合はundefined）
 */
const createFlowProgressCallback = (progressJson: boolean): FlowProgressCallback | undefined => {
  if (!progressJson) {
    return undefined;
  }

  return (
    progress:
      | { type: 'flow:start'; flowName: string; stepTotal: number }
      | { type: 'flow:complete'; flowName: string; status: 'passed' | 'failed'; duration: number },
  ): void => {
    outputProgressJson(progress);
  };
};

/**
 * 各ステップの結果を表示する（verboseモードのみ）
 *
 * @param steps - ステップ実行結果の配列
 * @param formatter - 出力フォーマッター
 */
const displayStepResults = (steps: FlowRunSummary['steps'], formatter: OutputFormatter): void => {
  formatter.newline();
  formatter.indent('Steps:', 1);
  for (const step of steps) {
    const stepDesc = formatCommandDescription(step.command);
    const statusIcon = step.status === 'passed' ? '✓' : '✗';
    formatter.indent(`${statusIcon} Step ${step.index + 1}: ${stepDesc} (${step.duration}ms)`, 2);
    if (step.status === 'failed') {
      formatter.indent(`Error: ${step.error.message}`, 3);
    }
  }
};

/**
 * フロー実行結果を表示する
 *
 * @param summary - フロー実行サマリー
 * @param formatter - 出力フォーマッター
 * @param verbose - verboseモードフラグ
 */
const displayFlowResult = (
  summary: FlowRunSummary,
  formatter: OutputFormatter,
  verbose: boolean,
): void => {
  formatter.newline();

  if (summary.status === 'passed') {
    formatter.success(`PASSED: ${summary.flowName}.enbu.yaml`, summary.duration);
  } else {
    formatter.failure(`FAILED: ${summary.flowName}.enbu.yaml`, summary.duration);
    if (summary.error) {
      formatter.indent(`Step ${summary.error.stepIndex + 1} failed: ${summary.error.message}`, 1);
      if (summary.error.screenshot) {
        formatter.indent(`Screenshot: ${summary.error.screenshot}`, 1);
      }
    }
  }

  // 各ステップの結果を表示（verboseモードのみ）
  if (verbose) {
    displayStepResults(summary.steps, formatter);
  }

  formatter.newline();
};

/**
 * OrchestratorErrorをCliErrorに変換する
 *
 * @param error - OrchestratorError
 * @returns CliError
 */
const toCliError = (error: OrchestratorError): CliError => {
  return {
    type: 'execution_error' as const,
    message: error.message,
  };
};

/**
 * RunFlowsOutputの結果を表示する
 *
 * @param output - runFlowsの実行結果
 * @param formatter - 出力フォーマッター
 * @param verbose - verboseモードフラグ
 */
const displayResults = (
  output: RunFlowsOutput,
  formatter: OutputFormatter,
  verbose: boolean,
): void => {
  // 各フローの結果を表示
  for (const flowSummary of output.flows) {
    displayFlowResult(flowSummary, formatter, verbose);
  }

  // サマリー表示
  formatter.separator();
  formatter.info(
    `Summary: ${output.passed}/${output.total} flows passed (${(output.duration / 1000).toFixed(1)}s)`,
  );

  if (output.failed > 0) {
    formatter.newline();
    formatter.error('Exit code: 1');
  }
};

/**
 * runコマンドを実行する
 *
 * @param args - runコマンドの引数
 * @param formatter - 出力フォーマッター
 * @returns 成功時: 実行結果、失敗時: CliError
 */
export const runFlowCommand = (
  args: RunCommandArgs,
  formatter: OutputFormatter,
): ResultAsync<FlowExecutionResult, CliError> => {
  formatter.debug(`Args: ${JSON.stringify(args)}`);

  const input: RunFlowsInput = {
    files: args.files,
    cwd: process.cwd(),
    headed: args.headed,
    env: args.env,
    commandTimeoutMs: args.timeout,
    screenshot: args.screenshot,
    parallel: args.parallel,
    onStepProgress: createStepProgressCallback(args.progressJson),
    onFlowProgress: createFlowProgressCallback(args.progressJson),
  };

  return runFlows(input)
    .map((output) => {
      displayResults(output, formatter, args.verbose);
      return { passed: output.passed, failed: output.failed, total: output.total };
    })
    .mapErr((error) => toCliError(error));
};
