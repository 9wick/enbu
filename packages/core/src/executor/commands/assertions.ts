import { ok, err } from 'neverthrow';
import type { Result } from 'neverthrow';
import {
  browserWaitForSelector,
  browserWaitForText,
  browserWaitForNetworkIdle,
  browserIsVisible,
  browserIsEnabled,
  browserIsChecked,
  asSelector,
} from '@packages/agent-browser-adapter';
import type { AgentBrowserError, Selector } from '@packages/agent-browser-adapter';
import type {
  AssertVisibleCommand,
  AssertNotVisibleCommand,
  AssertEnabledCommand,
  AssertCheckedCommand,
} from '../../types';
import type {
  ExecutionContext,
  CommandResult,
  AssertionFailedError,
  ExecutorError,
} from '../result';
import { isCssOrRefSelector, resolveTextSelector } from './selector-utils';

/**
 * セレクタを解決する
 * autoWaitで解決されたresolvedRefがあればそれを使用、なければ元のセレクタを使用
 *
 * @returns セレクタのResult型。空文字列の場合はエラー。
 */
const resolveSelector = (
  originalSelector: string,
  context: ExecutionContext,
): Result<Selector, AgentBrowserError> => {
  return asSelector(context.resolvedRef ?? originalSelector);
};

/**
 * assertVisible/assertNotVisible用のセレクタを解決する
 *
 * autoWaitで解決されたresolvedRefがあればそれを使用、
 * なければテキストセレクタ変換を適用する。
 *
 * @returns セレクタのResult型。空文字列の場合はエラー。
 */
const resolveVisibilitySelector = (
  originalSelector: string,
  context: ExecutionContext,
): Result<Selector, AgentBrowserError> => {
  // autoWaitで解決されたrefがあればそれを使用
  if (context.resolvedRef) {
    return asSelector(context.resolvedRef);
  }
  // テキストセレクタの変換を適用
  return asSelector(resolveTextSelector(originalSelector));
};

/**
 * 要素の出現を待機する
 *
 * CSSセレクタ/@ref/text=形式の場合: browserWaitForSelector
 * テキストの場合: browserWaitForText
 *
 * @param originalSelector - 元のセレクタ
 * @param context - 実行コンテキスト
 * @returns 成功時はok(undefined)、失敗時はerr(AgentBrowserError)
 */
const waitForElement = async (
  originalSelector: string,
  context: ExecutionContext,
): Promise<Result<undefined, AgentBrowserError>> => {
  // @ref、#id、.class、[attr]、text= 形式の場合: browserWaitForSelector
  if (isCssOrRefSelector(originalSelector)) {
    const selectorResult = asSelector(originalSelector);
    if (selectorResult.isErr()) {
      return err(selectorResult.error);
    }
    const result = await browserWaitForSelector(selectorResult.value, context.executeOptions);
    return result.map(() => undefined);
  }

  // テキストの場合: browserWaitForText
  const result = await browserWaitForText(originalSelector, context.executeOptions);
  return result.map(() => undefined);
};

/**
 * ページの安定状態（networkidle）を待機する
 *
 * @param context - 実行コンテキスト
 * @returns 成功時はok(undefined)、失敗時はerr(AgentBrowserError)
 */
const waitForPageStable = async (
  context: ExecutionContext,
): Promise<Result<undefined, AgentBrowserError>> => {
  const result = await browserWaitForNetworkIdle(context.executeOptions);
  return result.map(() => undefined);
};

/**
 * assertVisible コマンドのハンドラ
 *
 * 指定されたセレクタの要素が表示されていることを確認する。
 *
 * 処理の流れ:
 * 1. agent-browserのwaitコマンドで要素の出現を待機
 *    - CSSセレクタ: wait <selector>
 *    - テキスト: wait --text <text>
 * 2. agent-browserのis visibleコマンドで表示状態を確認
 *
 * 要素が表示されていない場合は assertion_failed エラーを返す。
 *
 * @param command - assertVisible コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertVisible = async (
  command: AssertVisibleCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, ExecutorError>> => {
  const startTime = Date.now();

  // 1. 要素の出現を待機（autoWaitで解決済みでなければ）
  if (!context.resolvedRef) {
    const waitResult = await waitForElement(command.selector, context);
    if (waitResult.isErr()) {
      return err({
        type: 'timeout',
        command: 'wait',
        args: [command.selector],
        timeoutMs: context.autoWaitTimeoutMs,
      });
    }
  }

  // 2. セレクタを解決
  const selectorResult = resolveVisibilitySelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  // 3. 表示状態を確認
  return (await browserIsVisible(selectorResult.value, context.executeOptions)).andThen((data) => {
    const duration = Date.now() - startTime;

    // アサーション条件を確認
    if (!data.visible) {
      const error: AssertionFailedError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" is not visible`,
        command: 'assertVisible',
        selector: command.selector,
        expected: true,
        actual: false,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(data),
      duration,
    });
  });
};

/**
 * assertNotVisible コマンドのハンドラ
 *
 * 指定されたセレクタの要素が表示されていないことを確認する。
 *
 * 処理の流れ:
 * 1. agent-browserのwaitコマンドでページの安定状態（networkidle）を待機
 *    - ページ遷移直後など、DOMが構築される前に判定しないようにする
 * 2. agent-browserのis visibleコマンドで表示状態を確認
 *
 * 要素が表示されている場合は assertion_failed エラーを返す。
 *
 * @param command - assertNotVisible コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertNotVisible = async (
  command: AssertNotVisibleCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, ExecutorError>> => {
  const startTime = Date.now();

  // 1. ページの安定状態を待機
  const waitResult = await waitForPageStable(context);
  if (waitResult.isErr()) {
    return err({
      type: 'timeout',
      command: 'wait',
      args: ['--load', 'networkidle'],
      timeoutMs: context.autoWaitTimeoutMs,
    });
  }

  // 2. セレクタを解決
  const selectorResult = resolveVisibilitySelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  // 3. 表示状態を確認
  return (await browserIsVisible(selectorResult.value, context.executeOptions)).andThen((data) => {
    const duration = Date.now() - startTime;

    // アサーション条件を確認
    if (data.visible) {
      const error: AssertionFailedError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" is visible`,
        command: 'assertNotVisible',
        selector: command.selector,
        expected: false,
        actual: true,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(data),
      duration,
    });
  });
};

/**
 * assertEnabled コマンドのハンドラ
 *
 * 指定されたセレクタの要素が有効化されていることを確認する。
 * agent-browser の is enabled コマンドを実行し、その結果を検証する。
 * 要素が有効化されていない場合は assertion_failed エラーを返す。
 *
 * @param command - assertEnabled コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertEnabled = async (
  command: AssertEnabledCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, ExecutorError>> => {
  const startTime = Date.now();

  // セレクタ検証
  const selectorResult = resolveSelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  return (await browserIsEnabled(selectorResult.value, context.executeOptions)).andThen((data) => {
    const duration = Date.now() - startTime;

    // アサーション条件を確認
    if (!data.enabled) {
      const error: AssertionFailedError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" is not enabled`,
        command: 'assertEnabled',
        selector: command.selector,
        expected: true,
        actual: false,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(data),
      duration,
    });
  });
};

/**
 * assertChecked コマンドのハンドラ
 *
 * 指定されたセレクタのチェックボックスがチェックされているか、または指定された状態であることを確認する。
 * agent-browser の is checked コマンドを実行し、その結果を検証する。
 * 期待値と実際の状態が一致しない場合は assertion_failed エラーを返す。
 *
 * @param command - assertChecked コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertChecked = async (
  command: AssertCheckedCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, ExecutorError>> => {
  const startTime = Date.now();

  // セレクタ検証
  const selectorResult = resolveSelector(command.selector, context);
  if (selectorResult.isErr()) {
    return err(selectorResult.error);
  }

  return (await browserIsChecked(selectorResult.value, context.executeOptions)).andThen((data) => {
    const duration = Date.now() - startTime;

    // アサーション条件を確認
    const expectedChecked = command.checked ?? true; // デフォルトはtrue
    const actualChecked = data.checked;

    if (actualChecked !== expectedChecked) {
      const error: AssertionFailedError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" checked state is ${actualChecked}, expected ${expectedChecked}`,
        command: 'assertChecked',
        selector: command.selector,
        expected: expectedChecked,
        actual: actualChecked,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(data),
      duration,
    });
  });
};
