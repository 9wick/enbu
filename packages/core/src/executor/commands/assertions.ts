import { ResultAsync, okAsync, errAsync } from 'neverthrow';
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
const waitForElement = (
  originalSelector: string,
  context: ExecutionContext,
): ResultAsync<undefined, AgentBrowserError> => {
  // @ref、#id、.class、[attr]、text= 形式の場合: browserWaitForSelector
  if (isCssOrRefSelector(originalSelector)) {
    return asSelector(originalSelector).match(
      (selector) => browserWaitForSelector(selector, context.executeOptions).map(() => undefined),
      (error) => errAsync(error),
    );
  }

  // テキストの場合: browserWaitForText
  return browserWaitForText(originalSelector, context.executeOptions).map(() => undefined);
};

/**
 * ページの安定状態（networkidle）を待機する
 *
 * @param context - 実行コンテキスト
 * @returns 成功時はok(undefined)、失敗時はerr(AgentBrowserError)
 */
const waitForPageStable = (context: ExecutionContext): ResultAsync<undefined, AgentBrowserError> =>
  browserWaitForNetworkIdle(context.executeOptions).map(() => undefined);

/**
 * 表示状態を確認するヘルパー関数
 */
const checkVisibility = (
  selector: string,
  data: { visible: boolean },
  startTime: number,
): ResultAsync<CommandResult, AssertionFailedError> => {
  const duration = Date.now() - startTime;

  if (!data.visible) {
    const error: AssertionFailedError = {
      type: 'assertion_failed',
      message: `Element "${selector}" is not visible`,
      command: 'assertVisible',
      selector,
      expected: true,
      actual: false,
    };
    return errAsync(error);
  }

  return okAsync({
    stdout: JSON.stringify(data),
    duration,
  });
};

/**
 * セレクタを取得して表示状態を確認する
 */
const getAndCheckVisibility = (
  originalSelector: string,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  resolveVisibilitySelector(originalSelector, context).match(
    (selector) =>
      browserIsVisible(selector, context.executeOptions).andThen((data) =>
        checkVisibility(originalSelector, data, startTime),
      ),
    (error) => errAsync(error),
  );

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
export const handleAssertVisible = (
  command: AssertVisibleCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, ExecutorError> => {
  const startTime = Date.now();

  // 1. 要素の出現を待機（autoWaitで解決済みでなければ）
  const waitStep = context.resolvedRef
    ? okAsync<undefined, ExecutorError>(undefined)
    : waitForElement(command.selector, context).mapErr(
        (): ExecutorError => ({
          type: 'timeout',
          command: 'wait',
          args: [command.selector],
          timeoutMs: context.autoWaitTimeoutMs,
        }),
      );

  // 2. セレクタを解決して表示状態を確認
  return waitStep.andThen(() => getAndCheckVisibility(command.selector, context, startTime));
};

/**
 * 非表示状態を確認するヘルパー関数
 */
const checkNotVisible = (
  selector: string,
  data: { visible: boolean },
  startTime: number,
): ResultAsync<CommandResult, AssertionFailedError> => {
  const duration = Date.now() - startTime;

  if (data.visible) {
    const error: AssertionFailedError = {
      type: 'assertion_failed',
      message: `Element "${selector}" is visible`,
      command: 'assertNotVisible',
      selector,
      expected: false,
      actual: true,
    };
    return errAsync(error);
  }

  return okAsync({
    stdout: JSON.stringify(data),
    duration,
  });
};

/**
 * セレクタを取得して非表示状態を確認する
 */
const getAndCheckNotVisible = (
  originalSelector: string,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  resolveVisibilitySelector(originalSelector, context).match(
    (selector) =>
      browserIsVisible(selector, context.executeOptions).andThen((data) =>
        checkNotVisible(originalSelector, data, startTime),
      ),
    (error) => errAsync(error),
  );

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
export const handleAssertNotVisible = (
  command: AssertNotVisibleCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, ExecutorError> => {
  const startTime = Date.now();

  // 1. ページの安定状態を待機
  return waitForPageStable(context)
    .mapErr(
      (): ExecutorError => ({
        type: 'timeout',
        command: 'wait',
        args: ['--load', 'networkidle'],
        timeoutMs: context.autoWaitTimeoutMs,
      }),
    )
    .andThen(() => getAndCheckNotVisible(command.selector, context, startTime));
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
export const handleAssertEnabled = (
  command: AssertEnabledCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, ExecutorError> => {
  const startTime = Date.now();

  // セレクタ検証とブラウザ操作実行
  return resolveSelector(command.selector, context).match(
    (selector) =>
      browserIsEnabled(selector, context.executeOptions).andThen((data) => {
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
          return errAsync(error);
        }

        return okAsync({
          stdout: JSON.stringify(data),
          duration,
        });
      }),
    (error) => errAsync(error),
  );
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
export const handleAssertChecked = (
  command: AssertCheckedCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, ExecutorError> => {
  const startTime = Date.now();

  // セレクタ検証とブラウザ操作実行
  return resolveSelector(command.selector, context).match(
    (selector) =>
      browserIsChecked(selector, context.executeOptions).andThen((data) => {
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
          return errAsync(error);
        }

        return okAsync({
          stdout: JSON.stringify(data),
          duration,
        });
      }),
    (error) => errAsync(error),
  );
};
