/**
 * ステップ実行モジュール
 *
 * このモジュールは各ステップの実行ロジックを提供する。
 * コマンドの種類に応じて適切なハンドラを選択し、セレクタ待機や
 * エラー時のスクリーンショット撮影を含む実行フローを管理する。
 */

import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { ResultAsync, okAsync, errAsync } from 'neverthrow';
import { P, match } from 'ts-pattern';
import type {
  Command,
  ResolvedCommand,
  ResolvedSelectorSpec,
  SelectorSpec,
  ResolvedClickCommand,
  ResolvedTypeCommand,
  ResolvedFillCommand,
  ResolvedHoverCommand,
  ResolvedSelectCommand,
  ResolvedAssertEnabledCommand,
  ResolvedAssertCheckedCommand,
  ResolvedAssertVisibleCommand,
  ResolvedAssertNotVisibleCommand,
  ResolvedScrollIntoViewCommand,
  ClickCommand,
  TypeCommand,
  FillCommand,
  HoverCommand,
  SelectCommand,
  AssertEnabledCommand,
  AssertCheckedCommand,
  AssertVisibleCommand,
  AssertNotVisibleCommand,
  ScrollIntoViewCommand,
} from '../types';
import { getCommandHandler } from './commands';
import { captureErrorScreenshot } from './error-screenshot';
import type { ExecutionContext, ExecutorError, ScreenshotResult, StepResult } from './result';
import { type WaitResult, waitForSelector } from './selector-wait';

/**
 * selector-wait.tsが受け付けるSelectorSpec型
 * （interactableTextのみ、anyTextは含まない）
 */
type WaitableSelectorSpec =
  | {
      css: import('@packages/agent-browser-adapter').CssSelector;
      interactableText?: never;
      xpath?: never;
    }
  | {
      css?: never;
      interactableText: import('@packages/agent-browser-adapter').InteractableTextSelector;
      xpath?: never;
    }
  | {
      css?: never;
      interactableText?: never;
      xpath: import('@packages/agent-browser-adapter').XpathSelector;
    };

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
 * セレクタ待機の失敗情報型
 *
 * 失敗時のStepResult生成に必要な情報を保持する。
 * '_tag'フィールドでExecutorErrorと識別可能なタグ付きユニオンとする。
 */
type SelectorWaitFailure = {
  readonly _tag: 'SelectorWaitFailure';
  readonly message: string;
  readonly errorType: ExecutorError['type'];
};

/**
 * WaitResultからResolvedSelectorSpecへの型安全な変換
 *
 * @param result - セレクタ待機の結果
 * @returns ResolvedSelectorSpec
 */
const waitResultToResolvedSelectorSpec = (result: WaitResult): ResolvedSelectorSpec =>
  match(result)
    .with({ type: 'css' }, (r): ResolvedSelectorSpec => ({ css: r.selector }))
    .with({ type: 'xpath' }, (r): ResolvedSelectorSpec => ({ xpath: r.selector }))
    .with({ type: 'ref' }, (r): ResolvedSelectorSpec => ({ ref: r.selector }))
    .exhaustive();

/**
 * SelectorSpecからResolvedSelectorSpecへの直接変換の結果型
 *
 * - resolved: css/xpath/textセレクタが変換された
 * - needs_wait: textセレクタで待機が必要（アクション系コマンド用）
 */
type DirectResolveResult =
  | { readonly type: 'resolved'; readonly spec: ResolvedSelectorSpec }
  | { readonly type: 'needs_wait' };

/**
 * SelectorSpecからResolvedSelectorSpecへの直接変換を試みる
 *
 * css/xpathセレクタはそのまま変換可能。
 * textセレクタは通常待機が必要だが、assertVisible/assertNotVisibleでは
 * textのまま保持して直接browserWaitForTextで確認するため、
 * allowTextオプションで制御する。
 *
 * @param spec - セレクタ指定
 * @param allowText - textセレクタを直接解決するか（assertVisible/assertNotVisible用）
 * @returns 変換結果
 */
const tryDirectResolve = (spec: SelectorSpec, allowText: boolean): DirectResolveResult =>
  match(spec)
    .with(
      { css: P.string },
      (s): DirectResolveResult => ({ type: 'resolved', spec: { css: s.css } }),
    )
    .with(
      { xpath: P.string },
      (s): DirectResolveResult => ({ type: 'resolved', spec: { xpath: s.xpath } }),
    )
    .with(
      { interactableText: P.string },
      (s): DirectResolveResult =>
        allowText
          ? { type: 'resolved', spec: { interactableText: s.interactableText } }
          : { type: 'needs_wait' },
    )
    .with(
      { anyText: P.string },
      (s): DirectResolveResult =>
        allowText ? { type: 'resolved', spec: { anyText: s.anyText } } : { type: 'needs_wait' },
    )
    .exhaustive();

/**
 * セレクタ待機が必要なコマンドを処理する
 *
 * セレクタの可視性を待機し、ResolvedCommandに変換する。
 *
 * @param command - セレクタを持つコマンド
 * @param spec - 抽出済みWaitableSelectorSpec（interactableTextのみ）
 * @param context - 実行コンテキスト
 * @returns 成功時: ResolvedCommand、失敗時: SelectorWaitFailure
 */
const processWaitableSelector = <T extends Command>(
  command: T,
  spec: WaitableSelectorSpec,
  context: ExecutionContext,
  resolveFunc: (cmd: T, resolved: ResolvedSelectorSpec) => ResolvedCommand,
): ResultAsync<ResolvedCommand, SelectorWaitFailure> =>
  waitForSelector(spec, context)
    .map(waitResultToResolvedSelectorSpec)
    .map((resolved) => resolveFunc(command, resolved))
    .mapErr(
      (error): SelectorWaitFailure => ({
        _tag: 'SelectorWaitFailure',
        message: `Selector wait timeout: ${getErrorMessage(error)}`,
        errorType: error.type,
      }),
    );

/**
 * SelectorSpecからWaitableSelectorSpecへの変換
 *
 * anyTextが含まれている場合はエラー（待機が必要なコマンドはinteractableTextのみ）
 */
const toWaitableSelectorSpec = (
  spec: SelectorSpec,
): ResultAsync<WaitableSelectorSpec, SelectorWaitFailure> =>
  match(spec)
    .with(
      { css: P.string },
      (s): ResultAsync<WaitableSelectorSpec, SelectorWaitFailure> => okAsync({ css: s.css }),
    )
    .with(
      { interactableText: P.string },
      (s): ResultAsync<WaitableSelectorSpec, SelectorWaitFailure> =>
        okAsync({ interactableText: s.interactableText }),
    )
    .with(
      { xpath: P.string },
      (s): ResultAsync<WaitableSelectorSpec, SelectorWaitFailure> => okAsync({ xpath: s.xpath }),
    )
    .with(
      { anyText: P.string },
      (): ResultAsync<WaitableSelectorSpec, SelectorWaitFailure> =>
        errAsync({
          _tag: 'SelectorWaitFailure',
          message: 'anyText selector requires waiting, but should be resolved directly',
          errorType: 'parse_error',
        }),
    )
    .exhaustive();

/**
 * セレクタ待機不要なコマンドを直接解決する
 *
 * css/xpathセレクタはそのまま変換。textセレクタはallowTextに応じて処理。
 *
 * @param command - セレクタを持つコマンド
 * @param spec - 抽出済みSelectorSpec
 * @param allowText - textセレクタを直接解決するか
 * @param context - 実行コンテキスト（待機が必要な場合に使用）
 * @returns 成功時: ResolvedCommand、失敗時: SelectorWaitFailure
 */
const processDirectOrWaitSelector = <T extends Command>(
  command: T,
  spec: SelectorSpec,
  allowText: boolean,
  context: ExecutionContext,
  resolveFunc: (cmd: T, resolved: ResolvedSelectorSpec) => ResolvedCommand,
): ResultAsync<ResolvedCommand, SelectorWaitFailure> =>
  match(tryDirectResolve(spec, allowText))
    .with({ type: 'resolved' }, ({ spec: resolved }) => okAsync(resolveFunc(command, resolved)))
    .with({ type: 'needs_wait' }, () =>
      toWaitableSelectorSpec(spec).andThen((waitableSpec) =>
        processWaitableSelector(command, waitableSpec, context, resolveFunc),
      ),
    )
    .exhaustive();

/**
 * ClickCommandのResolvedCommand変換関数
 */
const resolveClick = (
  _cmd: ClickCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedClickCommand => ({
  command: 'click',
  ...resolved,
});

/**
 * TypeCommandのResolvedCommand変換関数
 */
const resolveType = (cmd: TypeCommand, resolved: ResolvedSelectorSpec): ResolvedTypeCommand => ({
  command: 'type',
  value: cmd.value,
  ...resolved,
});

/**
 * FillCommandのResolvedCommand変換関数
 */
const resolveFill = (cmd: FillCommand, resolved: ResolvedSelectorSpec): ResolvedFillCommand => ({
  command: 'fill',
  value: cmd.value,
  ...resolved,
});

/**
 * HoverCommandのResolvedCommand変換関数
 */
const resolveHover = (
  _cmd: HoverCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedHoverCommand => ({
  command: 'hover',
  ...resolved,
});

/**
 * SelectCommandのResolvedCommand変換関数
 */
const resolveSelect = (
  cmd: SelectCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedSelectCommand => ({
  command: 'select',
  value: cmd.value,
  ...resolved,
});

/**
 * AssertEnabledCommandのResolvedCommand変換関数
 */
const resolveAssertEnabled = (
  _cmd: AssertEnabledCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedAssertEnabledCommand => ({
  command: 'assertEnabled',
  ...resolved,
});

/**
 * AssertCheckedCommandのResolvedCommand変換関数
 */
const resolveAssertChecked = (
  cmd: AssertCheckedCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedAssertCheckedCommand => ({
  command: 'assertChecked',
  checked: cmd.checked,
  ...resolved,
});

/**
 * AssertVisibleCommandのResolvedCommand変換関数
 */
const resolveAssertVisible = (
  _cmd: AssertVisibleCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedAssertVisibleCommand => ({
  command: 'assertVisible',
  ...resolved,
});

/**
 * AssertNotVisibleCommandのResolvedCommand変換関数
 */
const resolveAssertNotVisible = (
  _cmd: AssertNotVisibleCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedAssertNotVisibleCommand => ({
  command: 'assertNotVisible',
  ...resolved,
});

/**
 * ScrollIntoViewCommandのResolvedCommand変換関数
 */
const resolveScrollIntoView = (
  _cmd: ScrollIntoViewCommand,
  resolved: ResolvedSelectorSpec,
): ResolvedScrollIntoViewCommand => ({
  command: 'scrollIntoView',
  ...resolved,
});

/**
 * SelectorSpecを抽出し、存在しない場合はエラーを返す
 */
const extractSelectorSpecOrFail = (
  command: Command,
): ResultAsync<SelectorSpec, SelectorWaitFailure> =>
  match(extractSelectorSpec(command))
    .with({ type: 'found' }, ({ spec }) => okAsync(spec))
    .with({ type: 'not_found' }, () =>
      errAsync<SelectorSpec, SelectorWaitFailure>({
        _tag: 'SelectorWaitFailure',
        message: 'Selector not found in command',
        errorType: 'parse_error',
      }),
    )
    .exhaustive();

/**
 * WaitableSelectorSpec（interactableTextのみ）を抽出し、存在しない場合はエラーを返す
 *
 * インタラクティブ要素のみを対象とするコマンド（click, type, fill, hover, select）用
 */
const extractWaitableSelectorSpecOrFail = (
  command: Command,
): ResultAsync<WaitableSelectorSpec, SelectorWaitFailure> =>
  match(extractSelectorSpec(command))
    .with({ type: 'found', spec: { css: P.string } }, ({ spec }) =>
      okAsync<WaitableSelectorSpec, SelectorWaitFailure>({ css: spec.css }),
    )
    .with({ type: 'found', spec: { interactableText: P.string } }, ({ spec }) =>
      okAsync<WaitableSelectorSpec, SelectorWaitFailure>({
        interactableText: spec.interactableText,
      }),
    )
    .with({ type: 'found', spec: { xpath: P.string } }, ({ spec }) =>
      okAsync<WaitableSelectorSpec, SelectorWaitFailure>({ xpath: spec.xpath }),
    )
    .with({ type: 'found', spec: { anyText: P.string } }, () =>
      errAsync<WaitableSelectorSpec, SelectorWaitFailure>({
        _tag: 'SelectorWaitFailure',
        message:
          'anyText selector is not supported for interactive commands. Use interactableText instead.',
        errorType: 'parse_error',
      }),
    )
    .with({ type: 'not_found' }, () =>
      errAsync<WaitableSelectorSpec, SelectorWaitFailure>({
        _tag: 'SelectorWaitFailure',
        message: 'Selector not found in command',
        errorType: 'parse_error',
      }),
    )
    .exhaustive();

/**
 * セレクタ待機を処理する（純粋なmatch + ResultAsyncチェーン版）
 *
 * コマンドの種類に応じてセレクタ待機を行い、ResolvedCommandを返す。
 * 各コマンドタイプごとに独立したパイプラインを持ち、静的解析で追跡可能。
 *
 * @param command - 実行するコマンド
 * @param context - 実行コンテキスト
 * @returns 成功時: ResolvedCommand、失敗時: SelectorWaitFailure
 */
const processSelectorWait = (
  command: Command,
  context: ExecutionContext,
): ResultAsync<ResolvedCommand, SelectorWaitFailure> =>
  match(command)
    // ========================================
    // 非セレクタコマンド群（セレクタ待機不要、そのまま返す）
    // ========================================
    .with({ command: 'open' }, (cmd) => okAsync<ResolvedCommand, SelectorWaitFailure>(cmd))
    .with({ command: 'press' }, (cmd) => okAsync<ResolvedCommand, SelectorWaitFailure>(cmd))
    .with({ command: 'scroll' }, (cmd) => okAsync<ResolvedCommand, SelectorWaitFailure>(cmd))
    .with({ command: 'wait' }, (cmd) => okAsync<ResolvedCommand, SelectorWaitFailure>(cmd))
    .with({ command: 'screenshot' }, (cmd) => okAsync<ResolvedCommand, SelectorWaitFailure>(cmd))
    .with({ command: 'eval' }, (cmd) => okAsync<ResolvedCommand, SelectorWaitFailure>(cmd))

    // ========================================
    // セレクタ待機が必要なコマンド群
    // ========================================
    .with({ command: 'click' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveClick),
      ),
    )
    .with({ command: 'type' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveType),
      ),
    )
    .with({ command: 'fill' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveFill),
      ),
    )
    .with({ command: 'hover' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveHover),
      ),
    )
    .with({ command: 'select' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveSelect),
      ),
    )
    .with({ command: 'assertEnabled' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveAssertEnabled),
      ),
    )
    .with({ command: 'assertChecked' }, (cmd) =>
      extractWaitableSelectorSpecOrFail(cmd).andThen((spec) =>
        processWaitableSelector(cmd, spec, context, resolveAssertChecked),
      ),
    )

    // ========================================
    // セレクタ待機不要だがセレクタを持つコマンド群
    // css/xpathは直接解決、textは直接解決可能
    // ========================================
    .with({ command: 'assertVisible' }, (cmd) =>
      extractSelectorSpecOrFail(cmd).andThen((spec) =>
        processDirectOrWaitSelector(cmd, spec, true, context, resolveAssertVisible),
      ),
    )
    .with({ command: 'assertNotVisible' }, (cmd) =>
      extractSelectorSpecOrFail(cmd).andThen((spec) =>
        processDirectOrWaitSelector(cmd, spec, true, context, resolveAssertNotVisible),
      ),
    )

    // ========================================
    // scrollIntoView: css/xpath/textすべて直接解決可能（text=形式で実行）
    // ========================================
    .with({ command: 'scrollIntoView' }, (cmd) =>
      extractSelectorSpecOrFail(cmd).andThen((spec) =>
        processDirectOrWaitSelector(cmd, spec, true, context, resolveScrollIntoView),
      ),
    )
    .exhaustive();

/**
 * 単一のステップを実行する
 *
 * ステップの実行は以下の流れで行われる:
 * 1. セレクタ待機が必要なコマンドの場合は要素が利用可能になるまで待機
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

  // セレクタ待機 → ハンドラ実行 → 結果変換 のResultAsyncチェーン
  const result = await processSelectorWait(command, context)
    .andThen((resolvedCommand) => {
      const handler = getCommandHandler(command.command);
      return handler(resolvedCommand, context);
    })
    .match<Promise<StepResult>>(
      async (commandResult) => ({
        index,
        command,
        status: 'passed' as const,
        duration: Date.now() - startTime,
        stdout: commandResult.stdout,
      }),
      async (error) => {
        const screenshot = await takeErrorScreenshot(context, captureScreenshot);
        // SelectorWaitFailure | ExecutorError を型安全に分岐
        const { errorMessage, errorType } = match(error)
          .with({ _tag: 'SelectorWaitFailure' }, (e) => ({
            errorMessage: e.message,
            errorType: e.errorType,
          }))
          .otherwise((e) => ({
            errorMessage: getErrorMessage(e),
            errorType: e.type,
          }));

        return {
          index,
          command,
          status: 'failed' as const,
          duration: Date.now() - startTime,
          error: {
            message: errorMessage,
            type: errorType,
            screenshot,
          },
        };
      },
    );

  return result;
};

/**
 * SelectorSpec抽出の結果型
 *
 * - found: SelectorSpecが見つかった
 * - not_found: セレクタがない
 */
type ExtractSelectorResult =
  | { readonly type: 'found'; readonly spec: SelectorSpec }
  | { readonly type: 'not_found' };

/**
 * コマンドからSelectorSpecを抽出する
 *
 * @param command - セレクタを取得するコマンド
 * @returns SelectorSpec抽出結果
 */
const extractSelectorSpec = (command: Command): ExtractSelectorResult =>
  match<Command, ExtractSelectorResult>(command)
    .with(
      { css: P.string },
      (cmd): ExtractSelectorResult => ({
        type: 'found',
        spec: { css: cmd.css },
      }),
    )
    .with(
      { interactableText: P.string },
      (cmd): ExtractSelectorResult => ({
        type: 'found',
        spec: { interactableText: cmd.interactableText },
      }),
    )
    .with(
      { anyText: P.string },
      (cmd): ExtractSelectorResult => ({
        type: 'found',
        spec: { anyText: cmd.anyText },
      }),
    )
    .with(
      { xpath: P.string },
      (cmd): ExtractSelectorResult => ({
        type: 'found',
        spec: { xpath: cmd.xpath },
      }),
    )
    .otherwise((): ExtractSelectorResult => ({ type: 'not_found' }));
