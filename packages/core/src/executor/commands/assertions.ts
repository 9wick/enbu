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
import type { ExecutionContext, CommandResult } from '../result';
import { isCssOrRefSelector, resolveTextSelector } from './selector-utils';

/**
 * セレクタを解決する
 * autoWaitで解決されたresolvedRefがあればそれを使用、なければ元のセレクタを使用
 */
const resolveSelector = (originalSelector: string, context: ExecutionContext): Selector => {
  return asSelector(context.resolvedRef ?? originalSelector);
};

/**
 * assertVisible/assertNotVisible用のセレクタを解決する
 *
 * autoWaitで解決されたresolvedRefがあればそれを使用、
 * なければテキストセレクタ変換を適用する。
 */
const resolveVisibilitySelector = (
  originalSelector: string,
  context: ExecutionContext,
): Selector => {
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
    const result = await browserWaitForSelector(
      asSelector(originalSelector),
      context.executeOptions,
    );
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
): Promise<Result<CommandResult, AgentBrowserError>> => {
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

  // 2. 表示状態を確認
  const selector = resolveVisibilitySelector(command.selector, context);

  return (await browserIsVisible(selector, context.executeOptions)).andThen((output) => {
    const duration = Date.now() - startTime;

    // 1. コマンド実行の成否を確認
    if (!output.success) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: output.error || 'Failed to check visibility',
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      };
      return err(error);
    }

    // 2. データの妥当性を確認
    const visibleData = output.data;
    if (!visibleData) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: 'Invalid response data: missing visible field',
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    // 3. アサーション条件を確認
    if (!visibleData.visible) {
      const error: AgentBrowserError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" is not visible`,
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(output),
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
): Promise<Result<CommandResult, AgentBrowserError>> => {
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

  // 2. 表示状態を確認
  const selector = resolveVisibilitySelector(command.selector, context);

  return (await browserIsVisible(selector, context.executeOptions)).andThen((output) => {
    const duration = Date.now() - startTime;

    // 1. コマンド実行の成否を確認
    if (!output.success) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: output.error || 'Failed to check visibility',
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      };
      return err(error);
    }

    // 2. データの妥当性を確認
    const visibleData = output.data;
    if (!visibleData) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: 'Invalid response data: missing visible field',
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    // 3. アサーション条件を確認
    if (visibleData.visible) {
      const error: AgentBrowserError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" is visible`,
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(output),
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
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();
  const selector = resolveSelector(command.selector, context);

  return (await browserIsEnabled(selector, context.executeOptions)).andThen((output) => {
    const duration = Date.now() - startTime;

    // 1. コマンド実行の成否を確認
    if (!output.success) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: output.error || 'Failed to check enabled state',
        command: 'is',
        args: ['enabled', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      };
      return err(error);
    }

    // 2. データの妥当性を確認
    const enabledData = output.data;
    if (!enabledData) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: 'Invalid response data: missing enabled field',
        command: 'is',
        args: ['enabled', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    // 3. アサーション条件を確認
    if (!enabledData.enabled) {
      const error: AgentBrowserError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" is not enabled`,
        command: 'is',
        args: ['enabled', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(output),
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
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();
  const selector = resolveSelector(command.selector, context);

  return (await browserIsChecked(selector, context.executeOptions)).andThen((output) => {
    const duration = Date.now() - startTime;

    // 1. コマンド実行の成否を確認
    if (!output.success) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: output.error || 'Failed to check checked state',
        command: 'is',
        args: ['checked', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      };
      return err(error);
    }

    // 2. データの妥当性を確認
    const checkedData = output.data;
    if (!checkedData) {
      const error: AgentBrowserError = {
        type: 'command_failed',
        message: 'Invalid response data: missing checked field',
        command: 'is',
        args: ['checked', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    // 3. アサーション条件を確認
    const expectedChecked = command.checked ?? true; // デフォルトはtrue
    const actualChecked = checkedData.checked;

    if (actualChecked !== expectedChecked) {
      const error: AgentBrowserError = {
        type: 'assertion_failed',
        message: `Element "${command.selector}" checked state is ${actualChecked}, expected ${expectedChecked}`,
        command: 'is',
        args: ['checked', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: null,
      };
      return err(error);
    }

    return ok({
      stdout: JSON.stringify(output),
      duration,
    });
  });
};
