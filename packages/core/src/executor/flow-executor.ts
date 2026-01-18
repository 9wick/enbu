/**
 * フロー実行エンジン
 *
 * このモジュールはYAMLフロー定義に基づいて、複数のステップを順次実行する機能を提供する。
 * 環境変数の展開、エラー時の処理（bail、スクリーンショット）、実行結果の集約を担当する。
 */

import { type Result, ok, err } from 'neverthrow';
import type { Flow } from '../types';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type {
  FlowResult,
  FlowExecutionOptions,
  StepResult,
  ExecutionContext,
  StepProgressCallback,
} from './result';
import { executeStep } from './execute-step';
import { expandEnvVars } from './env-expander';

// デバッグログ用（stderrに出力してno-consoleルールを回避）
const DEBUG = process.env.DEBUG_FLOW === '1';
const debugLog = (msg: string, ...args: unknown[]) => {
  if (DEBUG) process.stderr.write(`[flow-executor] ${msg} ${args.map(String).join(' ')}\n`);
};

/**
 * 失敗したフロー結果を構築する
 *
 * @param expandedFlow - 環境変数が展開されたフロー定義
 * @param sessionName - セッション名
 * @param duration - 全体の実行時間（ミリ秒）
 * @param steps - 実行済みのステップ結果の配列
 * @param firstFailureStep - 最初に失敗したステップの結果
 * @param firstFailureIndex - 最初に失敗したステップのインデックス
 * @returns 失敗したフロー結果
 */
const buildFailedFlowResult = (
  expandedFlow: Flow,
  sessionName: string,
  duration: number,
  steps: StepResult[],
  firstFailureStep: StepResult,
  firstFailureIndex: number,
): FlowResult => {
  return {
    flow: expandedFlow,
    sessionName,
    status: 'failed',
    duration,
    steps,
    error: {
      message: firstFailureStep.error!.message,
      stepIndex: firstFailureIndex,
      screenshot: firstFailureStep.error!.screenshot,
    },
  };
};

/**
 * 成功したフロー結果を構築する
 *
 * @param expandedFlow - 環境変数が展開されたフロー定義
 * @param sessionName - セッション名
 * @param duration - 全体の実行時間（ミリ秒）
 * @param steps - 実行済みのステップ結果の配列
 * @returns 成功したフロー結果
 */
const buildSuccessFlowResult = (
  expandedFlow: Flow,
  sessionName: string,
  duration: number,
  steps: StepResult[],
): FlowResult => {
  return {
    flow: expandedFlow,
    sessionName,
    status: 'passed',
    duration,
    steps,
  };
};

/**
 * 実行コンテキストを構築する
 *
 * @param options - フロー実行オプション
 * @param flow - フロー定義（flow.envを使用）
 * @returns 実行コンテキスト
 */
const buildExecutionContext = (options: FlowExecutionOptions, flow: Flow): ExecutionContext => {
  // Flow.envとoptions.envをマージする（options.envが優先）
  const mergedEnv = {
    ...flow.env,
    ...options.env,
  };

  return {
    sessionName: options.sessionName,
    executeOptions: {
      sessionName: options.sessionName,
      headed: options.headed ?? false,
      timeoutMs: options.commandTimeoutMs ?? 30000,
      cwd: options.cwd,
    },
    env: mergedEnv,
    autoWaitTimeoutMs: options.autoWaitTimeoutMs ?? 30000,
    autoWaitIntervalMs: options.autoWaitIntervalMs ?? 100,
  };
};

/**
 * 全ステップを実行する
 *
 * @param expandedFlow - 環境変数が展開されたフロー定義
 * @param context - 実行コンテキスト
 * @param screenshot - スクリーンショットを撮影するか
 * @param bail - エラー時に即座に停止するか
 * @param startTime - 実行開始時刻
 * @param onStepProgress - ステップ進捗コールバック（オプション）
 * @returns ステップの実行結果とフロー結果（bailの場合のみ）
 */
const executeAllSteps = async (
  expandedFlow: Flow,
  context: ExecutionContext,
  screenshot: boolean,
  bail: boolean,
  startTime: number,
  onStepProgress?: StepProgressCallback,
): Promise<{
  steps: StepResult[];
  hasFailure: boolean;
  firstFailureIndex: number;
  earlyResult?: Result<FlowResult, AgentBrowserError>;
}> => {
  debugLog('executeAllSteps start', { stepCount: expandedFlow.steps.length, bail, screenshot });
  const steps: StepResult[] = [];
  let hasFailure = false;
  let firstFailureIndex = -1;
  const stepTotal = expandedFlow.steps.length;

  for (let i = 0; i < expandedFlow.steps.length; i++) {
    const command = expandedFlow.steps[i];
    debugLog(`step ${i + 1}/${expandedFlow.steps.length} start:`, command);

    // ステップ開始を通知
    if (onStepProgress) {
      await onStepProgress({ stepIndex: i, stepTotal, status: 'started' });
    }

    const stepResult = await executeStep(command, i, context, screenshot);
    debugLog(`step ${i + 1} done:`, { status: stepResult.status, duration: stepResult.duration });
    steps.push(stepResult);

    // ステップ完了を通知
    if (onStepProgress) {
      await onStepProgress({ stepIndex: i, stepTotal, status: 'completed', stepResult });
    }

    if (stepResult.status === 'failed') {
      if (!hasFailure) {
        hasFailure = true;
        firstFailureIndex = i;
      }

      if (bail) {
        const duration = Date.now() - startTime;
        return {
          steps,
          hasFailure,
          firstFailureIndex,
          earlyResult: ok(
            buildFailedFlowResult(
              expandedFlow,
              context.sessionName,
              duration,
              steps,
              stepResult,
              i,
            ),
          ),
        };
      }
    }
  }

  return { steps, hasFailure, firstFailureIndex };
};

/**
 * フローを実行する
 *
 * フロー実行の処理フローは以下の通り:
 * 1. オプションのデフォルト値を設定
 * 2. 実行コンテキストを構築（Flow.envとoptions.envをマージ）
 * 3. フロー内の環境変数を展開（未定義変数はエラー）
 * 4. 各ステップを順次実行
 * 5. エラー発生時の処理:
 *    - `bail: true`（デフォルト）: 最初の失敗で即座に停止
 *    - `bail: false`: 失敗ステップをスキップして続行
 * 6. スクリーンショット撮影:
 *    - `screenshot: true`（デフォルト）: 失敗時にスクリーンショットを撮影
 *    - `screenshot: false`: スクリーンショットを撮影しない
 * 7. 実行結果を集約して返す
 *
 * @param flow - 実行するフロー定義（YAMLから読み込んだもの）
 * @param options - 実行時のオプション（セッション名、タイムアウト、環境変数など）
 * @returns フロー実行結果（成功時）、またはエラー（失敗時）
 *
 * @remarks
 * ## エラーハンドリングの設計
 * - 個別のステップエラーは StepResult 内に格納される
 * - フロー全体のエラーは FlowResult.error に格納される
 * - executeFlow自体がerrを返すのは以下のケース:
 *   - agent-browserが起動できない場合
 *   - 環境変数の展開に失敗した場合（未定義変数など）
 * - ステップの失敗は正常な実行結果として扱われ、okで返される
 *
 * ## bail オプションの動作
 * - bail: true の場合、最初の失敗で即座に FlowResult を返す
 * - bail: false の場合、全てのステップを実行し、最後に FlowResult を返す
 * - いずれの場合も、失敗があれば status: 'failed' となる
 *
 * ## 環境変数のマージ
 * - Flow.envとoptions.envをマージして使用
 * - 優先順位: options.env > Flow.env（実行時オプションが優先）
 */
export const executeFlow = async (
  flow: Flow,
  options: FlowExecutionOptions,
): Promise<Result<FlowResult, AgentBrowserError>> => {
  const startTime = Date.now();
  const bail = options.bail ?? true;
  const screenshot = options.screenshot ?? true;
  const context = buildExecutionContext(options, flow);

  // 環境変数を展開（未定義変数がある場合はエラーを返す）
  const expandResult = expandEnvVars(flow, context.env);
  if (expandResult.isErr()) {
    return err(expandResult.error);
  }
  const expandedFlow = expandResult.value;

  const { steps, hasFailure, firstFailureIndex, earlyResult } = await executeAllSteps(
    expandedFlow,
    context,
    screenshot,
    bail,
    startTime,
    options.onStepProgress,
  );

  if (earlyResult) {
    return earlyResult;
  }

  const duration = Date.now() - startTime;

  if (hasFailure) {
    const firstFailureStep = steps[firstFailureIndex];
    return ok(
      buildFailedFlowResult(
        expandedFlow,
        context.sessionName,
        duration,
        steps,
        firstFailureStep,
        firstFailureIndex,
      ),
    );
  }

  return ok(buildSuccessFlowResult(expandedFlow, context.sessionName, duration, steps));
};
