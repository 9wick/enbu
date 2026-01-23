/**
 * フロー実行エンジン
 *
 * このモジュールはYAMLフロー定義に基づいて、複数のステップを順次実行する機能を提供する。
 * エラー時の処理（bail、スクリーンショット）、実行結果の集約を担当する。
 *
 * @remarks
 * 環境変数の展開はParser層（env-resolver）で行われるため、
 * このモジュールに渡されるFlowは既に環境変数が解決済みである前提。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { browserClose } from '@packages/agent-browser-adapter';
import { errAsync, ok, okAsync, type Result, ResultAsync } from 'neverthrow';
import type { Flow } from '../types';
import { executeStep } from './execute-step';
import type {
  ExecutionContext,
  FailedFlowResult,
  FailedStepResult,
  FlowExecutionOptions,
  FlowResult,
  NoCallback,
  PassedFlowResult,
  StepProgressCallback,
  StepResult,
} from './result';
import { isFailedStepResult } from './result';

// デバッグログ用（stderrに出力してno-consoleルールを回避）
const DEBUG = process.env.DEBUG_FLOW === '1';
const debugLog = (msg: string, ...args: unknown[]) => {
  if (DEBUG) process.stderr.write(`[flow-executor] ${msg} ${args.map(String).join(' ')}\n`);
};

/**
 * NoCallbackかどうかを判定する型ガード関数
 *
 * @param callback - 判定対象のコールバック
 * @returns NoCallbackの場合はfalse、StepProgressCallbackの場合はtrue
 */
const isStepProgressCallback = (
  callback: StepProgressCallback | NoCallback,
): callback is StepProgressCallback => {
  return typeof callback === 'function';
};

/**
 * 失敗したフロー結果を構築する
 *
 * @param expandedFlow - 環境変数が展開されたフロー定義
 * @param sessionName - セッション名
 * @param duration - 全体の実行時間（ミリ秒）
 * @param steps - 実行済みのステップ結果の配列
 * @param firstFailureStep - 最初に失敗したステップの結果（必ずfailedステータス）
 * @param firstFailureIndex - 最初に失敗したステップのインデックス
 * @returns 失敗したフロー結果
 */
const buildFailedFlowResult = (
  expandedFlow: Flow,
  sessionName: string,
  duration: number,
  steps: StepResult[],
  firstFailureStep: FailedStepResult,
  firstFailureIndex: number,
): FailedFlowResult => {
  return {
    flow: expandedFlow,
    sessionName,
    status: 'failed',
    duration,
    steps,
    error: {
      message: firstFailureStep.error.message,
      stepIndex: firstFailureIndex,
      screenshot: firstFailureStep.error.screenshot,
    },
  };
};

/**
 * 成功したフロー結果を構築する
 *
 * @param expandedFlow - 環境変数が展開されたフロー定義
 * @param duration - 全体の実行時間（ミリ秒）
 * @param steps - 実行済みのステップ結果の配列
 * @returns 成功したフロー結果
 */
const buildSuccessFlowResult = (
  expandedFlow: Flow,
  duration: number,
  steps: StepResult[],
): PassedFlowResult => {
  return {
    flow: expandedFlow,
    status: 'passed',
    duration,
    steps,
  };
};

/**
 * ユニークなセッション名を生成する
 *
 * 並列実行時の衝突を防ぐため、タイムスタンプとランダム値を組み合わせる。
 * Unixドメインソケットのパス長制限（約108バイト）を考慮し、セッション名は短くする。
 *
 * @param prefix - セッション名のプレフィックス（デフォルト: 'enbu'）
 * @returns ユニークなセッション名（{prefix}-timestamp-random 形式）
 */
const generateSessionName = (prefix = 'enbu'): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * SessionSpec からセッション名を解決する
 *
 * @param spec - セッション指定
 * @returns セッション名
 */
const resolveSessionName = (spec: FlowExecutionOptions['session']): string => {
  switch (spec.type) {
    case 'name':
      return spec.value;
    case 'prefix':
      return generateSessionName(spec.value);
    case 'default':
      return generateSessionName('enbu');
  }
};

/**
 * 実行コンテキストを構築する
 *
 * @param options - フロー実行オプション
 * @param flow - フロー定義（flow.envを使用）
 * @returns 実行コンテキスト
 */
const buildExecutionContext = (options: FlowExecutionOptions, flow: Flow): ExecutionContext => {
  const sessionName = resolveSessionName(options.session);

  // Flow.envとoptions.envをマージする（options.envが優先）
  const mergedEnv = {
    ...flow.env,
    ...options.env,
  };

  return {
    sessionName,
    executeOptions: {
      sessionName,
      headed: options.headed,
      timeoutMs: options.commandTimeoutMs,
      cwd: options.cwd,
    },
    env: mergedEnv,
    autoWaitTimeoutMs: options.autoWaitTimeoutMs,
    autoWaitIntervalMs: options.autoWaitIntervalMs,
  };
};

/**
 * 早期終了（bailで失敗）した場合の実行結果
 */
type EarlyExitResult = {
  readonly kind: 'earlyExit';
  readonly result: Result<FlowResult, AgentBrowserError>;
  readonly steps: StepResult[];
  readonly hasFailure: true;
  readonly firstFailureIndex: number;
};

/**
 * 最後まで実行した場合の実行結果
 */
type CompletedAllSteps = {
  readonly kind: 'completed';
  readonly steps: StepResult[];
  readonly hasFailure: boolean;
  readonly firstFailureIndex: number;
};

/**
 * executeAllStepsの実行結果
 *
 * @remarks
 * タグ付きユニオンでステップ実行の終了状態を表現する：
 * - earlyExit: bail=trueで失敗した場合（早期終了）
 * - completed: 最後まで実行した場合（失敗を含む可能性あり）
 */
type ExecuteAllStepsResult = EarlyExitResult | CompletedAllSteps;

/**
 * 全ステップを実行する
 *
 * @param expandedFlow - 環境変数が展開されたフロー定義
 * @param context - 実行コンテキスト
 * @param screenshot - スクリーンショットを撮影するか
 * @param bail - エラー時に即座に停止するか
 * @param startTime - 実行開始時刻
 * @param onStepProgress - ステップ進捗コールバック
 * @returns タグ付きユニオンによる実行結果（earlyExit または completed）
 */
const executeAllSteps = async (
  expandedFlow: Flow,
  context: ExecutionContext,
  screenshot: boolean,
  bail: boolean,
  startTime: number,
  onStepProgress: StepProgressCallback | NoCallback,
): Promise<ExecuteAllStepsResult> => {
  debugLog('executeAllSteps start', { stepCount: expandedFlow.steps.length, bail, screenshot });
  const steps: StepResult[] = [];
  let hasFailure = false;
  let firstFailureIndex = -1;
  const stepTotal = expandedFlow.steps.length;

  for (let i = 0; i < expandedFlow.steps.length; i++) {
    const command = expandedFlow.steps[i];
    debugLog(`step ${i + 1}/${expandedFlow.steps.length} start:`, command);

    // ステップ開始を通知
    if (isStepProgressCallback(onStepProgress)) {
      await onStepProgress({ stepIndex: i, stepTotal, status: 'started' });
    }

    const stepResult = await executeStep(command, i, context, screenshot);
    debugLog(`step ${i + 1} done:`, { status: stepResult.status, duration: stepResult.duration });
    steps.push(stepResult);

    // ステップ完了を通知
    if (isStepProgressCallback(onStepProgress)) {
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
          kind: 'earlyExit' as const,
          result: ok(
            buildFailedFlowResult(
              expandedFlow,
              context.sessionName,
              duration,
              steps,
              stepResult,
              i,
            ),
          ),
          steps,
          hasFailure: true,
          firstFailureIndex,
        };
      }
    }
  }

  return {
    kind: 'completed' as const,
    steps,
    hasFailure,
    firstFailureIndex,
  };
};

/**
 * フローを実行する
 *
 * フロー実行の処理フローは以下の通り:
 * 1. オプションのデフォルト値を設定
 * 2. 実行コンテキストを構築
 * 3. 各ステップを順次実行
 * 4. エラー発生時の処理:
 *    - `bail: true`（デフォルト）: 最初の失敗で即座に停止
 *    - `bail: false`: 失敗ステップをスキップして続行
 * 5. スクリーンショット撮影:
 *    - `screenshot: true`（デフォルト）: 失敗時にスクリーンショットを撮影
 *    - `screenshot: false`: スクリーンショットを撮影しない
 * 6. 実行結果を集約して返す
 *
 * @param flow - 実行するフロー定義（環境変数は解決済みである前提）
 * @param options - 実行時のオプション（セッション名、タイムアウトなど）
 * @returns フロー実行結果（成功時）、またはエラー（失敗時）
 *
 * @remarks
 * ## 前提条件
 * - 環境変数の展開はParser層（env-resolver）で既に完了している前提
 * - flowに含まれる${VAR}形式の変数は全て解決済み
 *
 * ## エラーハンドリングの設計
 * - 個別のステップエラーは StepResult 内に格納される
 * - フロー全体のエラーは FlowResult.error に格納される
 * - executeFlow自体がerrを返すのは以下のケース:
 *   - agent-browserが起動できない場合
 *   - 予期しない内部エラーが発生した場合
 * - ステップの失敗は正常な実行結果として扱われ、okで返される
 *
 * ## bail オプションの動作
 * - bail: true の場合、最初の失敗で即座に FlowResult を返す
 * - bail: false の場合、全てのステップを実行し、最後に FlowResult を返す
 * - いずれの場合も、失敗があれば status: 'failed' となる
 */
export const executeFlow = (
  flow: Flow,
  options: FlowExecutionOptions,
): ResultAsync<FlowResult, AgentBrowserError> => {
  const context = buildExecutionContext(options, flow);
  const bail = options.bail;
  const screenshot = options.screenshot;
  const startTime = Date.now();

  return ResultAsync.fromPromise(
    executeAllSteps(flow, context, screenshot, bail, startTime, options.onStepProgress),
    (error): AgentBrowserError => ({
      type: 'command_execution_failed',
      message: 'executeFlow internal error',
      command: 'executeFlow',
      rawError: String(error),
    }),
  ).andThen((result) => {
    // タグ付きユニオンで分岐
    if (result.kind === 'earlyExit') {
      return result.result.match(
        (value) => okAsync(value),
        (error) => errAsync(error),
      );
    }

    // kind === 'completed' の場合
    const { steps, hasFailure, firstFailureIndex } = result;
    const duration = Date.now() - startTime;

    if (hasFailure) {
      const firstFailureStep = steps[firstFailureIndex];
      // hasFailure=trueの場合、firstFailureStepは必ずFailedStepResult
      // 型ガードを使用して型を絞り込む
      if (!isFailedStepResult(firstFailureStep)) {
        // 論理的にこのパスには到達しないが、型安全性のため
        const error: AgentBrowserError = {
          type: 'command_execution_failed',
          message: 'Internal error: firstFailureStep must have failed status',
          command: 'executeFlow',
          rawError: 'hasFailure is true but step status is not failed',
        };
        return errAsync(error);
      }
      return okAsync(
        buildFailedFlowResult(
          flow,
          context.sessionName,
          duration,
          steps,
          firstFailureStep,
          firstFailureIndex,
        ),
      );
    }

    // 成功時: session をクローズしてから結果を返す
    return browserClose(context.sessionName)
      .map(() => buildSuccessFlowResult(flow, duration, steps))
      .mapErr((error): AgentBrowserError => {
        if (error.type !== 'command_execution_failed') {
          return error;
        }
        return {
          type: 'command_execution_failed',
          message: 'Failed to close browser session',
          command: 'browserClose',
          rawError: String(error),
        };
      });
  });
};
