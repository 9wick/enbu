/**
 * コマンドバリデーター
 *
 * YAMLからパースされた未知の値を型安全なCommand型に変換する。
 * RawCommand（未検証）をCommand（Branded Type検証済み）に変換する。
 */

import {
  asFilePath,
  asJsExpression,
  asKeyboardKey,
  asSelector,
  asUrl,
} from '@packages/agent-browser-adapter';
import { err, ok, type Result } from 'neverthrow';
import { P, match } from 'ts-pattern';
import type { Command, ParseError, RawCommand } from '../../types';
import { UseDefault } from '../../types/utility-types';
import { normalizers } from './type-guards';

/**
 * ParseErrorを生成するヘルパー
 */
const makeError = (message: string, commandIndex: number, raw: RawCommand): ParseError => ({
  type: 'invalid_command',
  message,
  commandIndex,
  commandContent: raw,
});

// ==========================================
// 各コマンドのBranded Type変換関数
// ==========================================

/** openコマンドをBranded Typeに変換 */
const convertOpen = (
  raw: Extract<RawCommand, { command: 'open' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asUrl(raw.url).match(
    (url) => ok({ command: 'open', url } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** clickコマンドをBranded Typeに変換 */
const convertClick = (
  raw: Extract<RawCommand, { command: 'click' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'click', selector } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** typeコマンドをBranded Typeに変換 */
const convertType = (
  raw: Extract<RawCommand, { command: 'type' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'type', selector, value: raw.value } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** fillコマンドをBranded Typeに変換 */
const convertFill = (
  raw: Extract<RawCommand, { command: 'fill' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'fill', selector, value: raw.value } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** pressコマンドをBranded Typeに変換 */
const convertPress = (
  raw: Extract<RawCommand, { command: 'press' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asKeyboardKey(raw.key).match(
    (key) => ok({ command: 'press', key } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** hoverコマンドをBranded Typeに変換 */
const convertHover = (
  raw: Extract<RawCommand, { command: 'hover' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'hover', selector } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** selectコマンドをBranded Typeに変換 */
const convertSelect = (
  raw: Extract<RawCommand, { command: 'select' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'select', selector, value: raw.value } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** scrollIntoViewコマンドをBranded Typeに変換 */
const convertScrollIntoView = (
  raw: Extract<RawCommand, { command: 'scrollIntoView' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'scrollIntoView', selector } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** screenshotコマンドをBranded Typeに変換 */
const convertScreenshot = (
  raw: Extract<RawCommand, { command: 'screenshot' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asFilePath(raw.path).match(
    (path) =>
      ok({
        command: 'screenshot',
        path,
        full: raw.full ?? UseDefault,
      } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** evalコマンドをBranded Typeに変換 */
const convertEval = (
  raw: Extract<RawCommand, { command: 'eval' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asJsExpression(raw.script).match(
    (script) => ok({ command: 'eval', script } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** assertVisibleコマンドをBranded Typeに変換 */
const convertAssertVisible = (
  raw: Extract<RawCommand, { command: 'assertVisible' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'assertVisible', selector } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** assertNotVisibleコマンドをBranded Typeに変換 */
const convertAssertNotVisible = (
  raw: Extract<RawCommand, { command: 'assertNotVisible' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'assertNotVisible', selector } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** assertEnabledコマンドをBranded Typeに変換 */
const convertAssertEnabled = (
  raw: Extract<RawCommand, { command: 'assertEnabled' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) => ok({ command: 'assertEnabled', selector } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/** assertCheckedコマンドをBranded Typeに変換 */
const convertAssertChecked = (
  raw: Extract<RawCommand, { command: 'assertChecked' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  asSelector(raw.selector).match(
    (selector) =>
      ok({
        command: 'assertChecked',
        selector,
        checked: raw.checked ?? UseDefault,
      } as const),
    (e) => err(makeError(e.message, commandIndex, raw)),
  );

/**
 * RawWaitCommandをWaitCommandに変換する
 *
 * WaitCommandは複数のバリアントを持つため、ts-patternで型安全にルーティングする。
 */
const convertWait = (
  raw: Extract<RawCommand, { command: 'wait' }>,
  commandIndex: number,
): Result<Command, ParseError> =>
  match(raw)
    // ms: number - Branded Typeなし
    .with({ ms: P.number }, (r) => ok({ command: 'wait' as const, ms: r.ms }))
    // selector: Selector
    .with({ selector: P.string }, (r) =>
      asSelector(r.selector).match(
        (selector) => ok({ command: 'wait' as const, selector }),
        (e) => err(makeError(e.message, commandIndex, raw)),
      ),
    )
    // text: string - Branded Typeなし
    .with({ text: P.string }, (r) => ok({ command: 'wait' as const, text: r.text }))
    // load: LoadState - Branded Typeなし（リテラル型）
    .with({ load: P.string }, (r) => ok({ command: 'wait' as const, load: r.load }))
    // url: string - Branded Typeなし
    .with({ url: P.string }, (r) => ok({ command: 'wait' as const, url: r.url }))
    // fn: JsExpression
    .with({ fn: P.string }, (r) =>
      asJsExpression(r.fn).match(
        (fn) => ok({ command: 'wait' as const, fn }),
        (e) => err(makeError(e.message, commandIndex, raw)),
      ),
    )
    .exhaustive();

/** scrollコマンドをBranded Typeに変換（Branded Typeなし） */
const convertScroll = (
  raw: Extract<RawCommand, { command: 'scroll' }>,
): Result<Command, ParseError> =>
  ok({ command: 'scroll', direction: raw.direction, amount: raw.amount } as const);

/** snapshotコマンドをBranded Typeに変換（Branded Typeなし） */
const convertSnapshot = (): Result<Command, ParseError> => ok({ command: 'snapshot' } as const);

// ==========================================
// カテゴリ別変換関数（複雑度を分散）
// ==========================================

/** インタラクション系コマンドの型 */
type InteractionCmd = Extract<
  RawCommand,
  { command: 'click' | 'type' | 'fill' | 'press' | 'hover' | 'select' }
>;

/** 待機・キャプチャ系コマンドの型 */
type WaitCaptureCmd = Extract<RawCommand, { command: 'wait' | 'screenshot' | 'snapshot' }>;

/** eval・アサーション系コマンドの型 */
type EvalAssertCmd = Extract<
  RawCommand,
  { command: 'eval' | 'assertVisible' | 'assertNotVisible' | 'assertEnabled' | 'assertChecked' }
>;

/** インタラクション系コマンドを変換（複雑度: 7） */
const convertInteraction = (raw: InteractionCmd, idx: number): Result<Command, ParseError> => {
  switch (raw.command) {
    case 'click':
      return convertClick(raw, idx);
    case 'type':
      return convertType(raw, idx);
    case 'fill':
      return convertFill(raw, idx);
    case 'press':
      return convertPress(raw, idx);
    case 'hover':
      return convertHover(raw, idx);
    case 'select':
      return convertSelect(raw, idx);
  }
};

/** 待機・キャプチャ系コマンドを変換（複雑度: 4） */
const convertWaitCapture = (raw: WaitCaptureCmd, idx: number): Result<Command, ParseError> => {
  switch (raw.command) {
    case 'wait':
      return convertWait(raw, idx);
    case 'screenshot':
      return convertScreenshot(raw, idx);
    case 'snapshot':
      return convertSnapshot();
  }
};

/** eval・アサーション系コマンドを変換（複雑度: 6） */
const convertEvalAssert = (raw: EvalAssertCmd, idx: number): Result<Command, ParseError> => {
  switch (raw.command) {
    case 'eval':
      return convertEval(raw, idx);
    case 'assertVisible':
      return convertAssertVisible(raw, idx);
    case 'assertNotVisible':
      return convertAssertNotVisible(raw, idx);
    case 'assertEnabled':
      return convertAssertEnabled(raw, idx);
    case 'assertChecked':
      return convertAssertChecked(raw, idx);
  }
};

// ==========================================
// メイン変換関数
// ==========================================

/** インタラクション系コマンド名のセット */
const interactionCommands = new Set(['click', 'type', 'fill', 'press', 'hover', 'select']);

/** 待機・キャプチャ系コマンド名のセット */
const waitCaptureCommands = new Set(['wait', 'screenshot', 'snapshot']);

/** eval・アサーション系コマンド名のセット */
const evalAssertCommands = new Set([
  'eval',
  'assertVisible',
  'assertNotVisible',
  'assertEnabled',
  'assertChecked',
]);

/**
 * コマンドがInteractionCmdかどうかを判定する型ガード
 */
const isInteractionCmd = (raw: RawCommand): raw is InteractionCmd =>
  interactionCommands.has(raw.command);

/**
 * コマンドがWaitCaptureCmdかどうかを判定する型ガード
 */
const isWaitCaptureCmd = (raw: RawCommand): raw is WaitCaptureCmd =>
  waitCaptureCommands.has(raw.command);

/**
 * コマンドがEvalAssertCmdかどうかを判定する型ガード
 */
const isEvalAssertCmd = (raw: RawCommand): raw is EvalAssertCmd =>
  evalAssertCommands.has(raw.command);

/**
 * RawCommandをCommand（Branded Type）に変換する
 *
 * 各フィールドのBranded Type検証を行い、失敗した場合はParseErrorを返す。
 * 型ガードとカテゴリ別関数を使用して複雑度を分散する。
 *
 * @param raw - 正規化された未検証コマンド
 * @param commandIndex - コマンドのインデックス（エラーメッセージ用）
 * @returns 成功時: Branded Type検証済みCommand、失敗時: ParseError
 */
const toBrandedCommand = (raw: RawCommand, commandIndex: number): Result<Command, ParseError> => {
  // ナビゲーション系（1コマンド）
  if (raw.command === 'open') {
    return convertOpen(raw, commandIndex);
  }

  // スクロール系（2コマンド）
  if (raw.command === 'scroll') {
    return convertScroll(raw);
  }
  if (raw.command === 'scrollIntoView') {
    return convertScrollIntoView(raw, commandIndex);
  }

  // インタラクション系（6コマンド）
  if (isInteractionCmd(raw)) {
    return convertInteraction(raw, commandIndex);
  }

  // 待機・キャプチャ系（3コマンド）
  if (isWaitCaptureCmd(raw)) {
    return convertWaitCapture(raw, commandIndex);
  }

  // eval・アサーション系（5コマンド）
  if (isEvalAssertCmd(raw)) {
    return convertEvalAssert(raw, commandIndex);
  }

  // TypeScriptの網羅性チェック - ここには到達しない
  const _exhaustiveCheck: never = raw;
  return _exhaustiveCheck;
};

/**
 * コマンドを検証してCommand型に変換する
 *
 * YAML形式の入力を正規化されたCommand型に変換する。
 * 不正な形式の場合はParseErrorを返す。
 *
 * @param rawCommand - YAMLからパースされた未知の値
 * @param commandIndex - コマンドのインデックス（エラーメッセージ用）
 * @returns 成功時: 正規化されたCommand、失敗時: ParseError
 */
export const validateCommand = (
  rawCommand: unknown,
  commandIndex: number,
): Result<Command, ParseError> => {
  // nullやundefinedのチェック
  if (rawCommand === null || rawCommand === undefined) {
    return err({
      type: 'invalid_command',
      message: 'Command must be an object',
      commandIndex,
      commandContent: rawCommand,
    });
  }

  // オブジェクトでない場合
  if (typeof rawCommand !== 'object') {
    return err({
      type: 'invalid_command',
      message: `Command must be an object, got ${typeof rawCommand}`,
      commandIndex,
      commandContent: rawCommand,
    });
  }

  // 全てのnormalizerを試行してRawCommandを取得
  for (const normalizer of normalizers) {
    const result = normalizer(rawCommand);
    if (result !== null) {
      // RawCommand → Command（Branded Type検証）
      return toBrandedCommand(result, commandIndex);
    }
  }

  // どの型にもマッチしない
  return err({
    type: 'invalid_command',
    message: 'Unknown or invalid command format',
    commandIndex,
    commandContent: rawCommand,
  });
};
