/**
 * ステップ実行モジュール
 *
 * このモジュールは各ステップの実行ロジックを提供する。
 * コマンドの種類に応じて適切なハンドラを選択し、自動待機や
 * エラー時のスクリーンショット撮影を含む実行フローを管理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { Command } from '../types';
import type { StepResult, ExecutionContext } from './result';
import { autoWait } from './auto-wait';
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
    // 自動待機が必要なコマンドの場合
    if (shouldAutoWait(command)) {
      const waitResult = await autoWait(getSelectorFromCommand(command), context);

      // 自動待機失敗
      if (waitResult.isErr()) {
        const duration = Date.now() - startTime;
        const screenshot = captureScreenshot ? await captureErrorScreenshot(context) : undefined;

        return {
          index,
          command,
          status: 'failed',
          duration,
          error: {
            message: `Auto-wait timeout: ${getErrorMessage(waitResult.error)}`,
            type: waitResult.error.type,
            screenshot,
          },
        };
      }
    }

    // コマンドハンドラを取得
    const handler = getCommandHandler(command.command);

    // コマンド実行
    const result = await handler(command, context);

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
        // エラー時のスクリーンショット
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
    // 予期しないエラー（バグの可能性）
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
    'scrollIntoView',
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
