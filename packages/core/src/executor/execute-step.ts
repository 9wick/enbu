/**
 * ステップ実行モジュール
 *
 * このモジュールは各ステップの実行ロジックを提供する。
 * コマンドの種類に応じて適切なハンドラを選択し、自動待機や
 * エラー時のスクリーンショット撮影を含む実行フローを管理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { P, match } from 'ts-pattern';
import type { Command } from '../types';
import { autoWait, type SelectorInput } from './auto-wait';
import { getCommandHandler } from './commands';
import { captureErrorScreenshot } from './error-screenshot';
import type { ExecutionContext, ExecutorError, ScreenshotResult, StepResult } from './result';

/**
 * AgentBrowserErrorからメッセージを取得する
 *
 * timeout型にはmessageフィールドがないため、型に応じてメッセージを生成する。
 *
 * @param error - AgentBrowserError
 * @returns エラーメッセージ
 */
const getAgentBrowserErrorMessage = (error: AgentBrowserError): string => {
  if (error.type === 'timeout') {
    return `Timeout after ${error.timeoutMs}ms: ${error.command}`;
  }
  return error.message;
};

/**
 * エラー時のスクリーンショットを撮影し、ScreenshotResult型で返す
 *
 * @param context - 実行コンテキスト
 * @param captureScreenshot - スクリーンショット撮影が有効かどうか
 * @returns スクリーンショット撮影結果
 */
const takeErrorScreenshot = async (
  context: ExecutionContext,
  captureScreenshot: boolean,
): Promise<ScreenshotResult> => {
  if (!captureScreenshot) {
    return { status: 'disabled' };
  }

  return captureErrorScreenshot(context).match(
    (path): ScreenshotResult => ({ status: 'captured', path }),
    (error): ScreenshotResult => ({ status: 'failed', reason: getAgentBrowserErrorMessage(error) }),
  );
};

/**
 * メッセージフィールドを持つエラーかどうかを判定する
 *
 * @param error - ExecutorError
 * @returns メッセージフィールドを持つ場合はtrue
 */
const hasMessageField = (
  error: ExecutorError,
): error is Extract<ExecutorError, { message: string }> => {
  return (
    error.type === 'not_installed' ||
    error.type === 'command_failed' ||
    error.type === 'parse_error' ||
    error.type === 'assertion_failed' ||
    error.type === 'command_execution_failed' ||
    error.type === 'agent_browser_output_parse_error' ||
    error.type === 'brand_validation_error'
  );
};

/**
 * アサーションエラーのフォールバックメッセージを生成する
 *
 * @param error - アサーションエラー
 * @returns フォールバックメッセージ
 */
const getAssertionFallback = (
  error: Extract<ExecutorError, { type: 'assertion_failed' }>,
): string => {
  return error.message || `Assertion failed for command: ${error.command}`;
};

/**
 * コマンド失敗エラーのフォールバックメッセージを生成する
 *
 * @param error - コマンド失敗エラー
 * @returns フォールバックメッセージ
 */
const getCommandErrorFallback = (
  error: Extract<ExecutorError, { type: 'command_failed' }>,
): string => {
  return error.rawError || error.stderr || `Command failed: ${error.command}`;
};

/**
 * コマンド実行エラーのフォールバックメッセージを生成する
 *
 * ts-patternで型安全にエラーをルーティングし、メッセージを生成する。
 *
 * @param error - コマンド実行エラー
 * @returns フォールバックメッセージ
 */
const getCommandFailedFallback = (error: ExecutorError): string =>
  match(error)
    .with({ type: 'assertion_failed' }, getAssertionFallback)
    .with({ type: 'command_failed' }, getCommandErrorFallback)
    .with({ message: P.string }, (e) => e.message || 'Unknown error')
    .otherwise(() => 'Unknown error');

/**
 * ExecutorErrorからメッセージを取得する
 *
 * エラーの種類によってメッセージの形式が異なるため、
 * 統一的なメッセージを生成する。
 * messageフィールドが空文字列の場合は、rawErrorまたはstderrから
 * フォールバックメッセージを生成する。
 *
 * @param error - ExecutorError
 * @returns エラーメッセージ
 */
const getErrorMessage = (error: ExecutorError): string => {
  if (hasMessageField(error)) {
    // messageが空文字列でない場合はそのまま返す
    if (error.message) {
      return error.message;
    }

    // messageが空文字列の場合、rawErrorまたはstderrからフォールバック
    if (error.type === 'command_failed' || error.type === 'assertion_failed') {
      return getCommandFailedFallback(error);
    }

    // その他のエラー型（not_installed, parse_error）は空文字列でも返す
    // （これらは意図的に空にすることはないはず）
    return error.message;
  }

  // error.type === 'timeout'
  return `Timeout after ${error.timeoutMs}ms: ${error.command}`;
};

/**
 * 自動待機の結果型
 * 成功時はresolvedRefStateが更新されたコンテキスト、失敗時はエラー情報を持つStepResult
 */
type AutoWaitProcessResult =
  | { success: true; contextWithRef: ExecutionContext }
  | { success: false; failedResult: StepResult };

/**
 * 自動待機を処理する
 *
 * コマンドが自動待機を必要とする場合、要素が利用可能になるまで待機し、
 * 解決されたrefをコンテキストに設定する。
 *
 * @param command - 実行するコマンド
 * @param context - 実行コンテキスト
 * @param index - ステップのインデックス
 * @param startTime - 実行開始時刻
 * @param captureScreenshot - スクリーンショットを撮影するか
 * @returns 処理結果（成功時はコンテキスト、失敗時はStepResult）
 */
const processAutoWait = async (
  command: Command,
  context: ExecutionContext,
  index: number,
  startTime: number,
  captureScreenshot: boolean,
): Promise<AutoWaitProcessResult> => {
  // 自動待機が不要な場合は元のコンテキストをそのまま返す
  if (!shouldAutoWait(command)) {
    return { success: true, contextWithRef: context };
  }

  const selectorInput = getSelectorFromCommand(command);
  const waitResult = await autoWait(selectorInput, context);

  return waitResult.match<Promise<AutoWaitProcessResult>>(
    async (autoWaitResult) => {
      // autoWaitの結果に応じてコンテキストを更新
      if (autoWaitResult.type === 'resolved') {
        // 要素が見つかった場合: refをコンテキストに設定
        const contextWithRef: ExecutionContext = {
          ...context,
          resolvedRefState: { status: 'resolved' as const, ref: autoWaitResult.resolvedRef },
        };
        return { success: true, contextWithRef };
      }
      // スキップされた場合: コンテキストをそのまま返す
      return { success: true, contextWithRef: context };
    },
    async (error) => {
      // 自動待機失敗
      const duration = Date.now() - startTime;
      const screenshot = await takeErrorScreenshot(context, captureScreenshot);

      return {
        success: false,
        failedResult: {
          index,
          command,
          status: 'failed' as const,
          duration,
          error: {
            message: `Auto-wait timeout: ${getErrorMessage(error)}`,
            type: error.type,
            screenshot,
          },
        },
      };
    },
  );
};

/**
 * 単一のステップを実行する
 *
 * ステップの実行は以下の流れで行われる:
 * 1. 自動待機が必要なコマンドの場合は要素が利用可能になるまで待機
 * 2. コマンドハンドラを取得して実行
 * 3. 実行時間を計測
 * 4. エラー発生時はスクリーンショットを撮影（captureScreenshotフラグがtrueの場合のみ）
 *
 * @param command - 実行するコマンド
 * @param index - ステップのインデックス（0始まり）
 * @param context - 実行コンテキスト（セッション情報、タイムアウト設定など）
 * @param captureScreenshot - エラー時にスクリーンショットを撮影するかどうか
 * @returns ステップの実行結果（成功/失敗、実行時間、出力、エラー情報を含む）
 */
export const executeStep = async (
  command: Command,
  index: number,
  context: ExecutionContext,
  captureScreenshot: boolean,
): Promise<StepResult> => {
  const startTime = Date.now();

  try {
    // 自動待機を処理
    const autoWaitProcessResult = await processAutoWait(
      command,
      context,
      index,
      startTime,
      captureScreenshot,
    );
    if (!autoWaitProcessResult.success) {
      return autoWaitProcessResult.failedResult;
    }

    // コマンドハンドラを取得して実行
    const handler = getCommandHandler(command.command);
    const result = await handler(command, autoWaitProcessResult.contextWithRef);
    const duration = Date.now() - startTime;

    // 結果の処理
    return result.match(
      (commandResult) => ({
        index,
        command,
        status: 'passed' as const,
        duration,
        stdout: commandResult.stdout,
      }),
      async (error) => {
        const screenshot = await takeErrorScreenshot(context, captureScreenshot);

        return {
          index,
          command,
          status: 'failed' as const,
          duration,
          error: {
            message: getErrorMessage(error),
            type: error.type,
            screenshot,
          },
        };
      },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const screenshot = await takeErrorScreenshot(context, captureScreenshot);

    return {
      index,
      command,
      status: 'failed',
      duration,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'parse_error',
        screenshot,
      },
    };
  }
};

/**
 * 自動待機が必要なコマンドかどうかを判定する
 *
 * インタラクティブなコマンド（クリック、入力など）は、
 * 要素が利用可能になるまで自動的に待機する必要がある。
 *
 * 注意: 以下のコマンドはautoWait対象外
 * - assertVisible: 静的テキスト要素の確認にも使用されるが、静的テキストは
 *   snapshotのrefsに含まれないため、autoWaitでは見つけられない。
 *   ハンドラ内でPlaywrightのtext=形式に変換して処理する。
 * - assertNotVisible: 要素が存在しないか非表示であることを確認するため、
 *   autoWaitで要素の存在を確認してから実行すると論理的に矛盾する。
 *   agent-browserのis visibleコマンドは独自のタイムアウトを持っている。
 * - scrollIntoView: 画面外の要素にスクロールするコマンドのため、
 *   auto-wait（画面内要素のみをスナップショット）は不適切
 *
 * @param command - 判定するコマンド
 * @returns 自動待機が必要な場合はtrue、不要な場合はfalse
 */
const shouldAutoWait = (command: Command): boolean => {
  const autoWaitCommands = [
    'click',
    'type',
    'fill',
    'hover',
    'select',
    'assertEnabled',
    'assertChecked',
  ];

  return autoWaitCommands.includes(command.command);
};

/**
 * コマンドからセレクタ入力を取得する
 *
 * SelectorSpec形式 (css/ref/text) からセレクタ文字列を抽出する。
 * autoWaitはテキストセレクタを解決するために使用されるため、
 * textセレクタの場合もセレクタを返す。
 *
 * ts-patternで型安全にセレクタを抽出する。
 *
 * @param command - セレクタを取得するコマンド
 * @returns SelectorInput（hasSelector: セレクタあり、noSelector: セレクタなし）
 */
const getSelectorFromCommand = (command: Command): SelectorInput =>
  match(command)
    .with({ css: P.string }, (cmd) => ({
      type: 'hasSelector' as const,
      selector: cmd.css,
    }))
    .with({ ref: P.string }, (cmd) => ({
      type: 'hasSelector' as const,
      selector: cmd.ref,
    }))
    .with({ text: P.string }, (cmd) => ({
      type: 'hasSelector' as const,
      selector: cmd.text,
    }))
    .otherwise(() => ({ type: 'noSelector' as const }));
