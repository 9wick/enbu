/**
 * フロー実行パイプラインのメイン実装
 *
 * ファイル検出、読み込み、パース、実行、セッション管理を統合し、
 * 単一のエントリーポイント runFlows を提供する。
 *
 * @remarks
 * このモジュールはアプリケーション層への境界として機能するため、
 * undefinedの使用が許容される（optional引数の処理のため）。
 * eslint.config.mjsで除外設定済み。
 */

import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { glob } from 'glob';
import pLimit from 'p-limit';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import {
  browserClose,
  checkAgentBrowser,
  type AgentBrowserError,
} from '@packages/agent-browser-adapter';
import { parseFlowYaml } from '../parser/yaml-parser';
import type { Flow, ParseError } from '../types';
import { executeFlow, NO_CALLBACK, type ScreenshotResult } from '../executor';
import type { FlowExecutionOptions } from '../executor';
import type { FlowRunSummary, OrchestratorError, RunFlowsInput, RunFlowsOutput } from './types';

/**
 * ScreenshotResultからパスを取得する
 *
 * スクリーンショットが撮影成功した場合はパスを返し、
 * それ以外（失敗・無効）の場合はundefinedを返す。
 *
 * @param result - スクリーンショット撮影結果
 * @returns 撮影成功時はパス、それ以外はundefined
 */
const getScreenshotPath = (result: ScreenshotResult): string | undefined => {
  return result.status === 'captured' ? result.path : undefined;
};

/**
 * デフォルトの実行オプション
 */
const DEFAULT_OPTIONS = {
  headed: false,
  env: {},
  commandTimeoutMs: 30000,
  autoWaitTimeoutMs: 30000,
  autoWaitIntervalMs: 100,
  screenshot: true,
  bail: true,
  parallel: 1,
} as const;

/**
 * agent-browserのインストール状態を確認する
 *
 * @returns 成功時: void、失敗時: OrchestratorError
 */
const checkEnvironment = (): ResultAsync<void, OrchestratorError> =>
  checkAgentBrowser()
    .map(() => undefined)
    .mapErr(
      (error: AgentBrowserError): OrchestratorError => ({
        type: 'environment_error',
        message:
          error.type === 'not_installed'
            ? error.message
            : `agent-browser check failed: ${error.type}`,
      }),
    );

/**
 * ファイルパスまたはglobパターンからフローファイルを検出する
 *
 * @param files - ファイルパスまたはglobパターンの配列（空の場合は.enbuflow/*.enbu.yamlを検索）
 * @param cwd - 作業ディレクトリ
 * @returns 成功時: 解決されたファイルパスの配列、失敗時: OrchestratorError
 */
const discoverFlowFiles = (
  files: string[],
  cwd: string,
): ResultAsync<readonly string[], OrchestratorError> => {
  // ファイルパスが指定されている場合、絶対パスに変換
  if (files.length > 0) {
    return okAsync(files.map((f) => resolve(cwd, f)));
  }

  // 指定がない場合、.enbuflow/ 配下を検索
  const pattern = join(cwd, '.enbuflow', '*.enbu.yaml');
  return ResultAsync.fromPromise(
    glob(pattern),
    (error): OrchestratorError => ({
      type: 'no_flows_found',
      message: `Failed to search for flow files: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );
};

/**
 * 単一のフローファイルを読み込んでパースする
 *
 * @param filePath - フローファイルのパス
 * @param processEnv - プロセス環境変数
 * @param inputEnv - ユーザー指定の環境変数
 * @returns 成功時: Flowオブジェクト、失敗時: OrchestratorError
 */
const loadSingleFlow = (
  filePath: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  inputEnv: Readonly<Record<string, string>>,
): ResultAsync<Flow, OrchestratorError> => {
  const fileName = basename(filePath);

  return ResultAsync.fromPromise(
    readFile(filePath, 'utf-8'),
    (error): OrchestratorError => ({
      type: 'load_error',
      message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
    }),
  ).andThen((yamlContent) =>
    parseFlowYaml(yamlContent, fileName, processEnv, inputEnv).mapErr(
      (error): OrchestratorError => ({
        type: 'load_error',
        message: formatParseErrorMessage(error),
        filePath,
      }),
    ),
  );
};

/**
 * ParseErrorからユーザー向けエラーメッセージを生成する
 *
 * エラータイプに応じて適切なプレフィックスを付与する。
 */
const formatParseErrorMessage = (error: ParseError): string => {
  switch (error.type) {
    case 'yaml_syntax_error':
    case 'invalid_flow_structure':
    case 'invalid_command':
      return `Failed to parse YAML: ${error.message}`;
    case 'undefined_variable':
      return `Failed to resolve environment variable: ${error.message}`;
    case 'file_read_error':
      return `Failed to read file: ${error.message}`;
  }
};

/**
 * 全てのフローファイルを読み込む
 *
 * @param flowFiles - フローファイルパスの配列
 * @param processEnv - プロセス環境変数
 * @param inputEnv - ユーザー指定の環境変数
 * @returns 成功時: Flowオブジェクトの配列、失敗時: OrchestratorError
 */
const loadAllFlows = (
  flowFiles: readonly string[],
  processEnv: Readonly<Record<string, string | undefined>>,
  inputEnv: Readonly<Record<string, string>>,
): ResultAsync<readonly Flow[], OrchestratorError> => {
  const loadResults = flowFiles.map((filePath) => loadSingleFlow(filePath, processEnv, inputEnv));
  return ResultAsync.combine(loadResults);
};

/**
 * ユニークなセッション名を生成する
 *
 * 並列実行時の衝突を防ぐため、タイムスタンプとランダム値を組み合わせる。
 * Unixドメインソケットのパス長制限（約108バイト）を考慮し、セッション名は短くする。
 *
 * @param flowName - フロー名
 * @returns ユニークなセッション名
 */
const generateSessionName = (flowName: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  const shortName = flowName.slice(0, 10);
  return `enbu-${shortName}-${timestamp}-${random}`;
};

/**
 * FlowExecutionOptionsを構築する
 *
 * @param sessionName - セッション名
 * @param input - 実行オプション
 * @param cwd - 作業ディレクトリ
 * @returns FlowExecutionOptions
 */
const buildFlowExecutionOptions = (
  sessionName: string,
  input: RunFlowsInput,
  cwd: string,
): FlowExecutionOptions => {
  return {
    sessionName,
    headed: input.headed ?? DEFAULT_OPTIONS.headed,
    env: input.env ?? DEFAULT_OPTIONS.env,
    commandTimeoutMs: input.commandTimeoutMs ?? DEFAULT_OPTIONS.commandTimeoutMs,
    autoWaitTimeoutMs: input.autoWaitTimeoutMs ?? DEFAULT_OPTIONS.autoWaitTimeoutMs,
    autoWaitIntervalMs: input.autoWaitIntervalMs ?? DEFAULT_OPTIONS.autoWaitIntervalMs,
    cwd,
    screenshot: input.screenshot ?? DEFAULT_OPTIONS.screenshot,
    bail: input.bail ?? DEFAULT_OPTIONS.bail,
    onStepProgress: input.onStepProgress ?? NO_CALLBACK,
  };
};

/**
 * フロー進捗を通知する
 *
 * @param input - 実行オプション
 * @param flowName - フロー名
 * @param status - ステータス
 * @param duration - 実行時間
 * @param stepTotal - ステップ総数（開始時のみ）
 */
const notifyFlowProgress = async (
  input: RunFlowsInput,
  flowName: string,
  status: 'start' | 'passed' | 'failed',
  duration: number,
  stepTotal: number | undefined,
): Promise<void> => {
  if (!input.onFlowProgress) {
    return;
  }

  if (status === 'start') {
    await input.onFlowProgress({
      type: 'flow:start',
      flowName,
      stepTotal: stepTotal ?? 0,
    });
  } else {
    await input.onFlowProgress({
      type: 'flow:complete',
      flowName,
      status,
      duration,
    });
  }
};

/**
 * 単一フローを実行する
 *
 * @param flow - 実行するフロー
 * @param input - 実行オプション
 * @returns フロー実行結果のサマリー
 */
const executeSingleFlow = async (flow: Flow, input: RunFlowsInput): Promise<FlowRunSummary> => {
  const sessionName = generateSessionName(flow.name);
  const startTime = Date.now();

  await notifyFlowProgress(input, flow.name, 'start', 0, flow.steps.length);

  const options = buildFlowExecutionOptions(sessionName, input, input.cwd);
  const result = await executeFlow(flow, options);

  return result.match(
    async (flowResult): Promise<FlowRunSummary> => {
      const duration = Date.now() - startTime;
      const status = flowResult.status;

      await notifyFlowProgress(input, flow.name, status, duration, undefined);

      if (status === 'passed') {
        await browserClose(sessionName);
      }

      const summary: FlowRunSummary = {
        flowName: flow.name,
        status,
        duration,
        steps: flowResult.steps,
      };

      if (status === 'failed' && flowResult.error) {
        summary.error = {
          stepIndex: flowResult.error.stepIndex,
          message: flowResult.error.message,
          screenshot: getScreenshotPath(flowResult.error.screenshot),
        };
      }

      return summary;
    },
    async (error: AgentBrowserError): Promise<FlowRunSummary> => {
      const duration = Date.now() - startTime;

      await notifyFlowProgress(input, flow.name, 'failed', duration, undefined);

      return {
        flowName: flow.name,
        status: 'failed',
        duration,
        steps: [],
        error: {
          stepIndex: 0,
          message: `Execution error: ${error.type}`,
        },
      };
    },
  );
};

/**
 * 全てのフローを並列実行する
 *
 * @param flows - 実行するフロー配列
 * @param input - 実行オプション
 * @param startTime - 実行開始時刻
 * @returns フロー実行結果のサマリー配列
 */
const executeAllFlowsParallel = async (
  flows: readonly Flow[],
  input: RunFlowsInput,
  startTime: number,
): Promise<RunFlowsOutput> => {
  const parallelCount = input.parallel ?? DEFAULT_OPTIONS.parallel;
  const limit = pLimit(parallelCount);

  const summaries = await Promise.all(
    flows.map((flow) => limit(() => executeSingleFlow(flow, input))),
  );

  const passed = summaries.filter((s: FlowRunSummary) => s.status === 'passed').length;
  const failed = summaries.filter((s: FlowRunSummary) => s.status === 'failed').length;
  const duration = Date.now() - startTime;

  return {
    passed,
    failed,
    total: flows.length,
    duration,
    flows: summaries,
  };
};

/**
 * 全てのフローを順次実行する
 *
 * @param flows - 実行するフロー配列
 * @param input - 実行オプション
 * @param startTime - 実行開始時刻
 * @returns フロー実行結果のサマリー配列
 */
const executeAllFlowsSequential = async (
  flows: readonly Flow[],
  input: RunFlowsInput,
  startTime: number,
): Promise<RunFlowsOutput> => {
  const summaries: FlowRunSummary[] = [];

  for (const flow of flows) {
    const summary = await executeSingleFlow(flow, input);
    summaries.push(summary);
  }

  const passed = summaries.filter((s: FlowRunSummary) => s.status === 'passed').length;
  const failed = summaries.filter((s: FlowRunSummary) => s.status === 'failed').length;
  const duration = Date.now() - startTime;

  return {
    passed,
    failed,
    total: flows.length,
    duration,
    flows: summaries,
  };
};

/**
 * 全てのフローを実行する
 *
 * parallelオプションが1より大きい場合は並列実行、それ以外は順次実行。
 *
 * @param flows - 実行するフロー配列
 * @param input - 実行オプション
 * @param startTime - 実行開始時刻
 * @returns フロー実行結果
 */
const executeAllFlows = async (
  flows: readonly Flow[],
  input: RunFlowsInput,
  startTime: number,
): Promise<RunFlowsOutput> => {
  const parallel = input.parallel ?? DEFAULT_OPTIONS.parallel;
  if (parallel > 1) {
    return executeAllFlowsParallel(flows, input, startTime);
  }
  return executeAllFlowsSequential(flows, input, startTime);
};

/**
 * フロー実行パイプラインのメインエントリーポイント
 *
 * 以下の処理を順次実行する:
 * 1. agent-browserのインストール確認
 * 2. フローファイルの検出
 * 3. フローファイルの読み込み・パース
 * 4. フローの実行（順次または並列）
 * 5. 実行結果の集約
 *
 * @param input - 実行オプション
 * @returns 成功時: RunFlowsOutput、失敗時: OrchestratorError
 */
export const runFlows = (input: RunFlowsInput): ResultAsync<RunFlowsOutput, OrchestratorError> => {
  const startTime = Date.now();

  return (
    checkEnvironment()
      // フローファイル検出
      .andThen(() => discoverFlowFiles(input.files, input.cwd))
      // 空チェック
      .andThen((flowFiles) => {
        if (flowFiles.length === 0) {
          return errAsync<readonly string[], OrchestratorError>({
            type: 'no_flows_found',
            message: 'No flow files found',
          });
        }
        return okAsync(flowFiles);
      })
      // フローファイル読み込み
      .andThen((flowFiles) => loadAllFlows(flowFiles, process.env, input.env ?? {}))
      // フロー実行
      .andThen((flows) =>
        ResultAsync.fromPromise(
          executeAllFlows(flows, input, startTime),
          (error): OrchestratorError => ({
            type: 'execution_error',
            message: `Failed to execute flows: ${error instanceof Error ? error.message : String(error)}`,
            flowName: 'unknown',
          }),
        ),
      )
  );
};
