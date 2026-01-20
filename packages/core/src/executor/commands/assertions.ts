/**
 * アサーション系コマンドハンドラ
 *
 * assertVisible, assertNotVisible, assertEnabled, assertChecked などの
 * 検証系コマンドを処理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import {
  browserIsChecked,
  browserIsEnabled,
  browserIsVisible,
  browserWaitForNetworkIdle,
  browserWaitForSelector,
  browserWaitForText,
} from '@packages/agent-browser-adapter';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import type {
  AssertCheckedCommand,
  AssertEnabledCommand,
  AssertNotVisibleCommand,
  AssertVisibleCommand,
  SelectorSpec,
} from '../../types';
import { UseDefault } from '../../types/utility-types';
import type {
  AssertionFailedError,
  CommandResult,
  ExecutionContext,
  ExecutorError,
} from '../result';
import {
  type CliSelector,
  getSelectorForErrorMessage,
  getSelectorString,
  isTextSelector,
  resolveCliSelector,
} from './cli-selector-utils';

/**
 * 要素の出現を待機する
 *
 * CSSセレクタ/@ref形式の場合: browserWaitForSelector
 * テキストの場合: browserWaitForText
 *
 * @param spec - セレクタ指定
 * @param context - 実行コンテキスト
 * @returns 成功時はok(undefined)、失敗時はerr(AgentBrowserError)
 */
const waitForElement = (
  spec: SelectorSpec,
  context: ExecutionContext,
): ResultAsync<undefined, AgentBrowserError> => {
  // テキストセレクタの場合: browserWaitForText
  if (isTextSelector(spec)) {
    const text = getSelectorString(spec);
    return browserWaitForText(text, context.executeOptions).map(() => undefined);
  }

  // CSSセレクタまたはRefセレクタの場合: browserWaitForSelector
  return resolveCliSelector(spec, context)
    .andThen((selector) => browserWaitForSelector(selector, context.executeOptions))
    .map(() => undefined);
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
  selectorStr: string,
  data: { visible: boolean },
  startTime: number,
): ResultAsync<CommandResult, AssertionFailedError> => {
  const duration = Date.now() - startTime;

  if (!data.visible) {
    const error: AssertionFailedError = {
      type: 'assertion_failed',
      message: `Element "${selectorStr}" is not visible`,
      command: 'assertVisible',
      selector: selectorStr,
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
  spec: SelectorSpec,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  resolveCliSelector(spec, context).andThen((selector: CliSelector) =>
    browserIsVisible(selector, context.executeOptions).andThen((data) =>
      checkVisibility(getSelectorForErrorMessage(spec, context), data, startTime),
    ),
  );

/**
 * TextSelectorのassertVisible処理
 *
 * TextSelectorの場合、browserWaitForTextの成功自体が表示確認となる。
 * browserIsVisibleはCLIセレクタを必要とするため使用できない。
 *
 * @param selectorStr - セレクタ文字列
 * @param context - 実行コンテキスト
 * @param startTime - 開始時刻
 * @returns コマンド実行結果
 */
const handleTextSelectorVisible = (
  selectorStr: string,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  browserWaitForText(selectorStr, context.executeOptions)
    .map(
      (): CommandResult => ({
        stdout: JSON.stringify({ visible: true }),
        duration: Date.now() - startTime,
      }),
    )
    .mapErr(
      (): ExecutorError => ({
        type: 'assertion_failed',
        message: `Text "${selectorStr}" is not visible`,
        command: 'assertVisible',
        selector: selectorStr,
        expected: true,
        actual: false,
      }),
    );

/**
 * assertVisible コマンドのハンドラ
 *
 * 指定されたセレクタの要素が表示されていることを確認する。
 *
 * 処理の流れ:
 * - TextSelector: browserWaitForTextで直接確認（成功=表示）
 * - CSSセレクタ/Ref:
 *   1. agent-browserのwaitコマンドで要素の出現を待機
 *   2. agent-browserのis visibleコマンドで表示状態を確認
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
  const selectorStr = getSelectorString(command);

  // TextSelectorの場合: browserWaitForTextで直接確認
  if (isTextSelector(command)) {
    return handleTextSelectorVisible(selectorStr, context, startTime);
  }

  // CSSセレクタまたはRefセレクタの場合
  // 1. 要素の出現を待機（autoWaitで解決済みでなければ）
  const waitStep =
    context.resolvedRefState.status === 'resolved'
      ? okAsync<undefined, ExecutorError>(undefined)
      : waitForElement(command, context).mapErr(
          (): ExecutorError => ({
            type: 'timeout',
            command: 'wait',
            args: [selectorStr],
            timeoutMs: context.autoWaitTimeoutMs,
          }),
        );

  // 2. セレクタを解決して表示状態を確認
  return waitStep.andThen(() => getAndCheckVisibility(command, context, startTime));
};

/**
 * 非表示状態を確認するヘルパー関数
 */
const checkNotVisible = (
  selectorStr: string,
  data: { visible: boolean },
  startTime: number,
): ResultAsync<CommandResult, AssertionFailedError> => {
  const duration = Date.now() - startTime;

  if (data.visible) {
    const error: AssertionFailedError = {
      type: 'assertion_failed',
      message: `Element "${selectorStr}" is visible`,
      command: 'assertNotVisible',
      selector: selectorStr,
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
  spec: SelectorSpec,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  resolveCliSelector(spec, context).andThen((selector: CliSelector) =>
    browserIsVisible(selector, context.executeOptions).andThen((data) =>
      checkNotVisible(getSelectorForErrorMessage(spec, context), data, startTime),
    ),
  );

/**
 * 短いタイムアウトでテキストの非表示を確認する
 *
 * browserWaitForTextを短いタイムアウトで実行し、
 * タイムアウトすれば非表示（成功）、見つかれば表示（エラー）と判定する。
 *
 * @param selectorStr - セレクタ文字列
 * @param context - 実行コンテキスト
 * @param startTime - 開始時刻
 * @returns コマンド実行結果
 */
const checkTextNotVisible = async (
  selectorStr: string,
  context: ExecutionContext,
  startTime: number,
): Promise<ResultAsync<CommandResult, ExecutorError>> => {
  // 短いタイムアウトでテキストの存在を確認
  const shortTimeoutOptions = {
    ...context.executeOptions,
    timeout: 1000, // 1秒でタイムアウト
  };

  const waitResult = await browserWaitForText(selectorStr, shortTimeoutOptions);

  return waitResult.match(
    // browserWaitForTextが成功 = テキストが表示されている = assertNotVisible失敗
    () =>
      errAsync<CommandResult, ExecutorError>({
        type: 'assertion_failed',
        message: `Text "${selectorStr}" is visible`,
        command: 'assertNotVisible',
        selector: selectorStr,
        expected: false,
        actual: true,
      }),
    // browserWaitForTextが失敗（タイムアウト）= テキストが非表示 = 成功
    () =>
      okAsync<CommandResult, ExecutorError>({
        stdout: JSON.stringify({ visible: false }),
        duration: Date.now() - startTime,
      }),
  );
};

/**
 * TextSelectorのassertNotVisible処理
 *
 * TextSelectorの場合、ページの安定状態を待機してから、
 * browserWaitForTextがタイムアウトすれば非表示と判断する。
 * 短いタイムアウト（1秒）で確認を行う。
 *
 * @param selectorStr - セレクタ文字列
 * @param context - 実行コンテキスト
 * @param startTime - 開始時刻
 * @returns コマンド実行結果
 */
const handleTextSelectorNotVisible = (
  selectorStr: string,
  context: ExecutionContext,
  startTime: number,
): ResultAsync<CommandResult, ExecutorError> =>
  waitForPageStable(context)
    .mapErr(
      (): ExecutorError => ({
        type: 'timeout',
        command: 'wait',
        args: ['--load', 'networkidle'],
        timeoutMs: context.autoWaitTimeoutMs,
      }),
    )
    .andThen(() =>
      ResultAsync.fromSafePromise(checkTextNotVisible(selectorStr, context, startTime)).andThen(
        (result) => result,
      ),
    );

/**
 * assertNotVisible コマンドのハンドラ
 *
 * 指定されたセレクタの要素が表示されていないことを確認する。
 *
 * 処理の流れ:
 * - TextSelector: networkidleを待機後、browserWaitForTextがタイムアウトすれば成功
 * - CSSセレクタ/Ref:
 *   1. agent-browserのwaitコマンドでページの安定状態（networkidle）を待機
 *   2. agent-browserのis visibleコマンドで表示状態を確認
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
  const selectorStr = getSelectorString(command);

  // TextSelectorの場合: 特別な処理
  if (isTextSelector(command)) {
    return handleTextSelectorNotVisible(selectorStr, context, startTime);
  }

  // CSSセレクタまたはRefセレクタの場合
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
    .andThen(() => getAndCheckNotVisible(command, context, startTime));
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
  const selectorStr = getSelectorForErrorMessage(command, context);

  return resolveCliSelector(command, context).andThen((selector: CliSelector) =>
    browserIsEnabled(selector, context.executeOptions).andThen((data) => {
      const duration = Date.now() - startTime;

      // アサーション条件を確認
      if (!data.enabled) {
        const error: AssertionFailedError = {
          type: 'assertion_failed',
          message: `Element "${selectorStr}" is not enabled`,
          command: 'assertEnabled',
          selector: selectorStr,
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
  const selectorStr = getSelectorForErrorMessage(command, context);

  return resolveCliSelector(command, context).andThen((selector: CliSelector) =>
    browserIsChecked(selector, context.executeOptions).andThen((data) => {
      const duration = Date.now() - startTime;

      // アサーション条件を確認
      // UseDefaultの場合はデフォルト値trueを使用
      const expectedChecked: boolean = command.checked === UseDefault ? true : command.checked;
      const actualChecked = data.checked;

      if (actualChecked !== expectedChecked) {
        const error: AssertionFailedError = {
          type: 'assertion_failed',
          message: `Element "${selectorStr}" checked state is ${actualChecked}, expected ${expectedChecked}`,
          command: 'assertChecked',
          selector: selectorStr,
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
  );
};
