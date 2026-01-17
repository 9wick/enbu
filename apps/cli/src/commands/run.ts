/**
 * runコマンドの実装
 *
 * フローファイルを読み込み、agent-browserで実行する。
 * 実行結果を表示し、終了コードを返す。
 */

import { type Result, ok, err, fromPromise } from 'neverthrow';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import type { CliError, FlowExecutionResult } from '../types';
import type { OutputFormatter } from '../output/formatter';
import { checkAgentBrowser, type AgentBrowserError } from '@packages/agent-browser-adapter';
import { parseFlowYaml, type Flow, executeFlow, type FlowResult } from '@packages/core';

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
  /** 最初の失敗で停止するか */
  bail: boolean;
  /** セッション名 */
  session?: string;
  /** verboseモード */
  verbose: boolean;
};

/**
 * agent-browserのインストール状態を確認する
 *
 * @param formatter - 出力フォーマッター
 * @returns 成功時: void、失敗時: CliError
 */
const checkAgentBrowserInstallation = async (
  formatter: OutputFormatter,
): Promise<Result<void, CliError>> => {
  formatter.info('Checking agent-browser...');
  formatter.debug('Checking agent-browser installation...');

  const checkResult = await checkAgentBrowser();

  return checkResult.match(
    () => {
      formatter.success('agent-browser is installed');
      formatter.newline();
      return ok(undefined);
    },
    (error) => {
      formatter.failure('agent-browser is not installed');
      formatter.newline();
      formatter.error('Error: agent-browser is not installed');
      formatter.error('Please install it with: npm install -g agent-browser');

      const errorMessage =
        error.type === 'not_installed'
          ? error.message
          : `${error.type}: ${error.type === 'command_failed' ? (error.errorMessage ?? error.stderr) : ''}`;

      return err({
        type: 'execution_error' as const,
        message: errorMessage,
      });
    },
  );
};

/**
 * フローファイルパスの配列を解決する
 *
 * ファイルが指定されていない場合、.abflow/ ディレクトリから検索する。
 *
 * @param files - 指定されたファイルパスの配列
 * @returns 成功時: 解決されたファイルパスの配列、失敗時: CliError
 */
const resolveFlowFiles = async (files: string[]): Promise<Result<string[], CliError>> => {
  if (files.length > 0) {
    // ファイルパスが指定されている場合、絶対パスに変換
    return ok(files.map((f) => resolve(process.cwd(), f)));
  }

  // 指定がない場合、.abflow/ 配下を検索
  const pattern = resolve(process.cwd(), '.abflow', '*.flow.yaml');
  return fromPromise(
    glob(pattern),
    (error): CliError => ({
      type: 'execution_error' as const,
      message: 'Failed to search for flow files',
      cause: error,
    }),
  );
};

/**
 * ファイルパスからフローを読み込んでパースする
 *
 * @param filePath - フローファイルのパス
 * @returns 成功時: Flowオブジェクト、失敗時: CliError
 */
const loadFlowFromFile = async (filePath: string): Promise<Result<Flow, CliError>> => {
  // ファイル読み込み
  const readResult = await fromPromise<string, CliError>(
    readFile(filePath, 'utf-8'),
    (error): CliError => ({
      type: 'execution_error' as const,
      message: `Failed to read file: ${filePath}`,
      cause: error,
    }),
  );

  if (readResult.isErr()) {
    return err(readResult.error);
  }

  const yamlContent = readResult.value;

  // ファイル名を抽出（拡張子付き）
  const fileName = filePath.split('/').pop() ?? 'unknown.flow.yaml';

  // YAMLをパース
  const parseResult = parseFlowYaml(yamlContent, fileName);
  return parseResult.mapErr(
    (parseError): CliError => ({
      type: 'execution_error' as const,
      message: `Failed to parse flow file: ${parseError.message}`,
      cause: parseError,
    }),
  );
};

/**
 * フローファイルを読み込む
 *
 * @param flowFiles - フローファイルパスの配列
 * @param formatter - 出力フォーマッター
 * @returns 成功時: Flowオブジェクトの配列、失敗時: CliError
 */
const loadFlows = async (
  flowFiles: string[],
  formatter: OutputFormatter,
): Promise<Result<Flow[], CliError>> => {
  formatter.info('Loading flows...');
  formatter.debug(`Loading flows from: ${flowFiles.join(', ')}`);

  // 各ファイルを順次読み込み
  const flows: Flow[] = [];
  for (const filePath of flowFiles) {
    const loadResult = await loadFlowFromFile(filePath);
    if (loadResult.isErr()) {
      formatter.failure(`Failed to load flows: ${loadResult.error.message}`);
      return err(loadResult.error);
    }
    flows.push(loadResult.value);
  }

  formatter.success(`Loaded ${flows.length} flow(s)`);
  formatter.newline();

  return ok(flows);
};

/**
 * コマンド説明フォーマッター関数の型
 */
type CommandFormatter = (command: Flow['steps'][number]) => string;

/**
 * コマンド説明のフォーマッター関数マップ
 */
const commandFormatters: Record<string, CommandFormatter> = {
  open: (cmd) => `open ${('url' in cmd && cmd.url) || ''}`,
  click: (cmd) =>
    'selector' in cmd
      ? `click "${cmd.selector}"${'index' in cmd && cmd.index !== undefined ? ` [${cmd.index}]` : ''}`
      : 'click',
  type: (cmd) =>
    'selector' in cmd && 'value' in cmd
      ? `type "${cmd.selector}" = "${cmd.value}"${'clear' in cmd && cmd.clear ? ' (clear)' : ''}`
      : 'type',
  fill: (cmd) =>
    'selector' in cmd && 'value' in cmd ? `fill "${cmd.selector}" = "${cmd.value}"` : 'fill',
  press: (cmd) => `press ${'key' in cmd ? cmd.key : ''}`,
  hover: (cmd) => ('selector' in cmd ? `hover "${cmd.selector}"` : 'hover'),
  select: (cmd) =>
    'selector' in cmd && 'value' in cmd ? `select "${cmd.selector}" = "${cmd.value}"` : 'select',
  scroll: (cmd) =>
    'direction' in cmd && 'amount' in cmd ? `scroll ${cmd.direction} ${cmd.amount}px` : 'scroll',
  scrollIntoView: (cmd) =>
    'selector' in cmd ? `scrollIntoView "${cmd.selector}"` : 'scrollIntoView',
  wait: (cmd) =>
    'ms' in cmd ? `wait ${cmd.ms}ms` : 'target' in cmd ? `wait "${cmd.target}"` : 'wait',
  screenshot: (cmd) =>
    'path' in cmd
      ? `screenshot ${cmd.path}${'fullPage' in cmd && cmd.fullPage ? ' (full page)' : ''}`
      : 'screenshot',
  snapshot: () => 'snapshot',
  eval: (cmd) =>
    'script' in cmd
      ? `eval "${cmd.script.substring(0, 50)}${cmd.script.length > 50 ? '...' : ''}"`
      : 'eval',
  assertVisible: (cmd) => ('selector' in cmd ? `assertVisible "${cmd.selector}"` : 'assertVisible'),
  assertEnabled: (cmd) => ('selector' in cmd ? `assertEnabled "${cmd.selector}"` : 'assertEnabled'),
  assertChecked: (cmd) =>
    'selector' in cmd
      ? `assertChecked "${cmd.selector}"${'checked' in cmd && cmd.checked === false ? ' (unchecked)' : ''}`
      : 'assertChecked',
};

/**
 * コマンドの説明を生成する
 *
 * @param command - コマンド
 * @returns コマンドの説明文字列
 */
const formatCommandDescription = (command: Flow['steps'][number]): string => {
  const formatter = commandFormatters[command.command];
  return formatter ? formatter(command) : 'unknown command';
};

/**
 * フローを実行しながら進捗を表示する
 *
 * @param flow - 実行するフロー
 * @param args - 実行オプション
 * @returns 成功時: FlowResult、失敗時: CliError
 */
const executeFlowWithProgress = async (
  flow: Flow,
  args: RunCommandArgs,
): Promise<Result<FlowResult, CliError>> => {
  // セッション名を生成（指定がない場合）
  const sessionName = args.session ?? `abf-${Date.now()}`;

  // フロー実行
  const executeResult = await executeFlow(flow, {
    sessionName,
    headed: args.headed,
    env: args.env,
    commandTimeoutMs: args.timeout,
    screenshot: args.screenshot,
    bail: args.bail,
  });

  return executeResult.mapErr((agentError: AgentBrowserError): CliError => {
    const errorMessage =
      agentError.type === 'not_installed'
        ? agentError.message
        : agentError.type === 'parse_error'
          ? agentError.message
          : agentError.type === 'timeout'
            ? `Timeout: ${agentError.command} (${agentError.timeoutMs}ms)`
            : (agentError.errorMessage ?? agentError.stderr);

    return {
      type: 'execution_error' as const,
      message: errorMessage,
      cause: agentError,
    };
  });
};

/**
 * 各ステップの結果を表示する（verboseモードのみ）
 */
const displayStepResults = (steps: FlowResult['steps'], formatter: OutputFormatter): void => {
  formatter.newline();
  formatter.indent('Steps:', 1);
  for (const step of steps) {
    const stepDesc = formatCommandDescription(step.command);
    const statusIcon = step.status === 'passed' ? '✓' : '✗';
    formatter.indent(`${statusIcon} Step ${step.index + 1}: ${stepDesc} (${step.duration}ms)`, 2);
    if (step.error) {
      formatter.indent(`Error: ${step.error.message}`, 3);
    }
  }
};

/**
 * フロー実行結果を表示する
 *
 * @param flow - 実行したフロー
 * @param result - フロー実行結果
 * @param formatter - 出力フォーマッター
 * @param verbose - verboseモードフラグ
 */
const displayFlowResult = (
  flow: Flow,
  result: FlowResult,
  formatter: OutputFormatter,
  verbose: boolean,
): void => {
  const duration = result.duration;

  formatter.newline();

  if (result.status === 'passed') {
    formatter.success(`PASSED: ${flow.name}.flow.yaml`, duration);
  } else {
    formatter.failure(`FAILED: ${flow.name}.flow.yaml`, duration);
    if (result.error) {
      formatter.indent(`Step ${result.error.stepIndex + 1} failed: ${result.error.message}`, 1);
      if (result.error.screenshot) {
        formatter.indent(`Screenshot: ${result.error.screenshot}`, 1);
      }
    }
  }

  // 各ステップの結果を表示（verboseモードのみ）
  if (verbose) {
    displayStepResults(result.steps, formatter);
  }

  formatter.newline();
};

/**
 * 全てのフローを実行する
 *
 * @param flows - 実行するフロー配列
 * @param args - 実行オプション
 * @param formatter - 出力フォーマッター
 * @returns フロー実行結果のサマリー
 */
const executeAllFlows = async (
  flows: Flow[],
  args: RunCommandArgs,
  formatter: OutputFormatter,
): Promise<FlowExecutionResult> => {
  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const flow of flows) {
    formatter.info(`Running: ${flow.name}.flow.yaml`);
    formatter.debug(`Executing flow: ${flow.name} (${flow.steps.length} steps)`);

    const flowStartTime = Date.now();

    // フロー実行
    const executeResult = await executeFlowWithProgress(flow, args);

    executeResult.match(
      (result) => {
        displayFlowResult(flow, result, formatter, args.verbose);

        if (result.status === 'passed') {
          passed++;
        } else {
          failed++;
        }
      },
      (error) => {
        failed++;
        const duration = Date.now() - flowStartTime;
        formatter.newline();
        formatter.failure(`FAILED: ${flow.name}.flow.yaml`, duration);
        formatter.indent(error.message, 1);
        formatter.newline();
      },
    );

    // --bail フラグが指定されていて、失敗した場合は中断
    if (args.bail && failed > 0) {
      formatter.error('Stopping due to --bail flag');
      formatter.newline();
      break;
    }
  }

  // サマリー表示
  formatter.separator();
  const totalDuration = Date.now() - startTime;
  const total = passed + failed;
  formatter.info(
    `Summary: ${passed}/${total} flows passed (${(totalDuration / 1000).toFixed(1)}s)`,
  );

  if (failed > 0) {
    formatter.newline();
    formatter.error('Exit code: 1');
  }

  return { passed, failed, total };
};

/**
 * runコマンドを実行する
 *
 * @param args - runコマンドの引数
 * @param formatter - 出力フォーマッター
 * @returns 成功時: 実行結果、失敗時: CliError
 */
export const runFlowCommand = async (
  args: RunCommandArgs,
  formatter: OutputFormatter,
): Promise<Result<FlowExecutionResult, CliError>> => {
  formatter.debug(`Args: ${JSON.stringify(args)}`);

  // 1. agent-browserインストール確認
  const checkResult = await checkAgentBrowserInstallation(formatter);
  if (checkResult.isErr()) {
    return err(checkResult.error);
  }

  // 2. フローファイル解決
  const flowFilesResult = await resolveFlowFiles(args.files);
  if (flowFilesResult.isErr()) {
    return err(flowFilesResult.error);
  }

  const flowFiles = flowFilesResult.value;

  if (flowFiles.length === 0) {
    formatter.error('Error: No flow files found');
    formatter.error('Try: npx agent-browser-flow init');
    return err({
      type: 'execution_error' as const,
      message: 'No flow files found',
    });
  }

  // 3. フローファイル読み込み
  const loadResult = await loadFlows(flowFiles, formatter);
  if (loadResult.isErr()) {
    return err(loadResult.error);
  }

  const flows = loadResult.value;

  // 4. フロー実行
  const executionResult = await executeAllFlows(flows, args, formatter);

  return ok(executionResult);
};
