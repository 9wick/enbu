/**
 * ステップ実行モジュール
 *
 * このモジュールは各ステップの実行ロジックを提供する。
 * コマンドの種類に応じて適切なハンドラを選択し、自動待機や
 * エラー時のスクリーンショット撮影を含む実行フローを管理する。
 */

import type { Result } from 'neverthrow';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { Command } from '../types';
import type { StepResult, ExecutionContext } from './result';
import { autoWait, type AutoWaitResult } from './auto-wait';
import { getCommandHandler } from './commands';
import { captureErrorScreenshot } from './error-screenshot';

/**
 * メッセージフィールドを持つエラーかどうかを判定する
 *
 * @param error - AgentBrowserError
 * @returns メッセージフィールドを持つ場合はtrue
 */
const hasMessageField = (
  error: AgentBrowserError,
): error is Extract<AgentBrowserError, { message: string }> => {
  return (
    error.type === 'not_installed' ||
    error.type === 'command_failed' ||
    error.type === 'parse_error' ||
    error.type === 'assertion_failed' ||
    error.type === 'validation_error'
  );
};

/**
 * コマンド実行エラーのフォールバックメッセージを生成する
 *
 * @param error - コマンド実行エラー
 * @returns フォールバックメッセージ
 */
const getCommandFailedFallback = (
  error: Extract<
    AgentBrowserError,
    { errorMessage: string | null; stderr: string; command: string }
  >,
): string => {
  return error.errorMessage || error.stderr || `Command failed: ${error.command}`;
};

/**
 * AgentBrowserErrorからメッセージを取得する
 *
 * エラーの種類によってメッセージの形式が異なるため、
 * 統一的なメッセージを生成する。
 * messageフィールドが空文字列の場合は、errorMessageまたはstderrから
 * フォールバックメッセージを生成する。
 *
 * @param error - AgentBrowserError
 * @returns エラーメッセージ
 */
const getErrorMessage = (error: AgentBrowserError): string => {
  if (hasMessageField(error)) {
    // messageが空文字列でない場合はそのまま返す
    if (error.message) {
      return error.message;
    }

    // messageが空文字列の場合、errorMessageまたはstderrからフォールバック
    if (
      error.type === 'command_failed' ||
      error.type === 'assertion_failed' ||
      error.type === 'validation_error'
    ) {
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
 * 成功時はresolvedRefを含むコンテキスト、失敗時はエラー情報を持つStepResult
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

  const selector = getSelectorFromCommand(command);
  const waitResult: Result<AutoWaitResult | undefined, AgentBrowserError> = await autoWait(
    selector,
    context,
  );

  // 自動待機失敗
  if (waitResult.isErr()) {
    const duration = Date.now() - startTime;
    const screenshot = captureScreenshot ? await captureErrorScreenshot(context) : undefined;

    return {
      success: false,
      failedResult: {
        index,
        command,
        status: 'failed',
        duration,
        error: {
          message: `Auto-wait timeout: ${getErrorMessage(waitResult.error)}`,
          type: waitResult.error.type,
          screenshot,
        },
      },
    };
  }

  // autoWaitで解決されたrefをcontextに設定
  const autoWaitResult = waitResult.value;
  const contextWithRef = autoWaitResult
    ? { ...context, resolvedRef: autoWaitResult.resolvedRef }
    : context;

  return { success: true, contextWithRef };
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
        const screenshot = captureScreenshot ? await captureErrorScreenshot(context) : undefined;

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
    const screenshot = captureScreenshot ? await captureErrorScreenshot(context) : undefined;

    return {
      index,
      command,
      status: 'failed',
      duration,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'validation_error',
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
 * - scrollIntoView: agent-browserのヘルプでは@ref形式をサポートすると記載されているが、
 *   実際の動作では「Unsupported token "@eN" while parsing css selector」エラーが発生する。
 *   これはagent-browserの内部実装（Playwright）とヘルプの記載が一致していないためと思われる。
 *   scrollIntoView自体はPlaywrightのscrollIntoViewIfNeededを使用しており、
 *   要素が見つかるまで内部で待機する仕組みを持っているため、autoWaitは不要。
 *   将来的にagent-browserが@ref形式に対応した場合は、autoWait対象に追加することを検討。
 * - assertNotVisible: 要素が存在しないか非表示であることを確認するため、
 *   autoWaitで要素の存在を確認してから実行すると論理的に矛盾する。
 *   agent-browserのis visibleコマンドは独自のタイムアウトを持っている。
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
    'assertVisible',
    'assertEnabled',
    'assertChecked',
  ];

  return autoWaitCommands.includes(command.command);
};

/**
 * コマンドからセレクタを取得する
 *
 * コマンドの種類によって、セレクタが格納されているフィールド名が異なる:
 * - 多くのコマンドは 'selector' フィールドを持つ
 * - 一部のコマンドは 'target' フィールドを持つ
 *
 * @param command - セレクタを取得するコマンド
 * @returns セレクタ文字列、セレクタを持たないコマンドの場合はundefined
 */
const getSelectorFromCommand = (command: Command): string | undefined => {
  if ('selector' in command) {
    return command.selector;
  }
  if ('target' in command && typeof command.target === 'string') {
    return command.target;
  }
  return undefined;
};
