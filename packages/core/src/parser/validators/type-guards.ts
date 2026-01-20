/**
 * コマンド型ガード・正規化関数
 *
 * YAMLからパースされた値を正規化されたRawCommand型に変換する。
 * 以下の2つの形式をサポート:
 * 1. 正規化済み形式: { command: 'click', selector: '...' }
 * 2. YAML簡略形式: { click: '...' }
 *
 * RawCommand型は未検証の状態であり、command-validatorで
 * Branded Typeに変換される。
 */

import { match, P } from 'ts-pattern';
import type {
  LoadState,
  RawAssertCheckedCommand,
  RawAssertEnabledCommand,
  RawAssertNotVisibleCommand,
  RawAssertVisibleCommand,
  RawClickCommand,
  RawCommand,
  RawEvalCommand,
  RawFillCommand,
  RawHoverCommand,
  RawOpenCommand,
  RawPressCommand,
  RawScreenshotCommand,
  RawScrollCommand,
  RawScrollIntoViewCommand,
  RawSelectCommand,
  RawSnapshotCommand,
  RawTypeCommand,
  RawWaitCommand,
} from '../../types';
import { UseDefault } from '../../types/utility-types';

/**
 * YAML簡略形式を検出するヘルパー
 *
 * { click: '...' } のような形式で、commandキーが存在しない場合にtrue
 * ts-patternを使って型安全に判定する。
 *
 * @param obj - チェック対象のオブジェクト
 * @param key - 検出するキー名
 * @returns YAML簡略形式の場合true
 */
const hasYamlKey = (obj: Record<string, unknown>, key: string): boolean =>
  match(obj)
    .with({ command: P.any }, () => false) // commandキーがあればfalse
    .otherwise(() => obj[key] !== undefined); // キーが存在するかチェック

/**
 * 値がRecord型かどうかを判定する型ガード
 *
 * unknown型の値がRecord<string, unknown>であることを型安全に判定する。
 * オブジェクトでない場合、nullの場合、配列の場合はfalseを返す。
 *
 * @param value - 変換対象の値
 * @returns Record型の場合true、それ以外false
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * 型安全なオブジェクト変換ヘルパー
 *
 * unknown型の値をRecord<string, unknown>に変換する。
 * オブジェクトでない場合はnullを返す。
 *
 * @param value - 変換対象の値
 * @returns オブジェクトの場合Record<string, unknown>、それ以外null
 */
const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) {
    return null;
  }
  return value;
};

/**
 * OpenCommandを正規化
 *
 * 正規化済み形式: { command: 'open', url: '...' }
 * YAML簡略形式: { open: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたOpenCommand、または不正な場合null
 */
export const normalizeOpenCommand = (value: unknown): RawOpenCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  // 正規化済み
  if (obj.command === 'open' && typeof obj.url === 'string') {
    return { command: 'open', url: obj.url };
  }

  // YAML簡略形式: { open: 'https://...' }
  if (hasYamlKey(obj, 'open') && typeof obj.open === 'string') {
    return { command: 'open', url: obj.open };
  }

  return null;
};

/**
 * ClickCommandを構築するヘルパー
 *
 * @param selector - セレクタ文字列
 * @returns ClickCommand
 */
const buildClickCommand = (selector: string): RawClickCommand => {
  return { command: 'click', selector };
};

/**
 * 正規化済みClickCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ClickCommand、または不正な場合null
 */
const checkNormalizedClick = (obj: Record<string, unknown>): RawClickCommand | null => {
  if (obj.command === 'click' && typeof obj.selector === 'string') {
    return buildClickCommand(obj.selector);
  }
  return null;
};

/**
 * YAML簡略形式のClickCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ClickCommand、または不正な場合null
 */
const checkYamlClick = (obj: Record<string, unknown>): RawClickCommand | null => {
  if (!hasYamlKey(obj, 'click')) {
    return null;
  }

  // { click: 'セレクタ' }
  if (typeof obj.click === 'string') {
    return { command: 'click', selector: obj.click };
  }

  // { click: { selector: '...' } }
  const inner: Record<string, unknown> | null = toRecord(obj.click);
  if (inner !== null && typeof inner.selector === 'string') {
    return buildClickCommand(inner.selector);
  }

  return null;
};

/**
 * ClickCommandを正規化
 *
 * 正規化済み形式: { command: 'click', selector: '...' }
 * YAML簡略形式: { click: '...' } または { click: { selector: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたClickCommand、または不正な場合null
 */
export const normalizeClickCommand = (value: unknown): RawClickCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawClickCommand | null = checkNormalizedClick(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlClick(obj);
};

/**
 * テキスト値を取得するヘルパー（text または value フィールド）
 *
 * @param obj - オブジェクト
 * @returns テキスト値、または存在しない場合null
 */
const extractTextOrValue = (obj: Record<string, unknown>): string | null => {
  if (typeof obj.text === 'string') {
    return obj.text;
  }
  if (typeof obj.value === 'string') {
    return obj.value;
  }
  return null;
};

/**
 * TypeCommandを構築するヘルパー
 *
 * @param selector - セレクタ文字列
 * @param value - 入力値
 * @returns TypeCommand
 */
const buildTypeCommand = (selector: string, value: string): RawTypeCommand => {
  return { command: 'type', selector, value };
};

/**
 * 正規化済みTypeCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns TypeCommand、または不正な場合null
 */
const checkNormalizedType = (obj: Record<string, unknown>): RawTypeCommand | null => {
  if (obj.command === 'type' && typeof obj.selector === 'string' && typeof obj.value === 'string') {
    return buildTypeCommand(obj.selector, obj.value);
  }
  return null;
};

/**
 * YAML簡略形式のTypeCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns TypeCommand、または不正な場合null
 */
const checkYamlType = (obj: Record<string, unknown>): RawTypeCommand | null => {
  if (!hasYamlKey(obj, 'type')) {
    return null;
  }

  const inner: Record<string, unknown> | null = toRecord(obj.type);
  if (inner === null || typeof inner.selector !== 'string') {
    return null;
  }

  const text: string | null = extractTextOrValue(inner);
  if (text === null) {
    return null;
  }

  return buildTypeCommand(inner.selector, text);
};

/**
 * TypeCommandを正規化
 *
 * 正規化済み形式: { command: 'type', selector: '...', value: '...' }
 * YAML簡略形式: { type: { selector: '...', text: '...' } } または { type: { selector: '...', value: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたTypeCommand、または不正な場合null
 */
export const normalizeTypeCommand = (value: unknown): RawTypeCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawTypeCommand | null = checkNormalizedType(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlType(obj);
};

/**
 * 正規化済みFillCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns FillCommand、または不正な場合null
 */
const checkNormalizedFill = (obj: Record<string, unknown>): RawFillCommand | null => {
  if (obj.command === 'fill' && typeof obj.selector === 'string' && typeof obj.value === 'string') {
    return { command: 'fill', selector: obj.selector, value: obj.value };
  }
  return null;
};

/**
 * YAML簡略形式のFillCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns FillCommand、または不正な場合null
 */
const checkYamlFill = (obj: Record<string, unknown>): RawFillCommand | null => {
  if (!hasYamlKey(obj, 'fill')) {
    return null;
  }

  const inner: Record<string, unknown> | null = toRecord(obj.fill);
  if (inner === null || typeof inner.selector !== 'string') {
    return null;
  }

  const text: string | null = extractTextOrValue(inner);
  if (text === null) {
    return null;
  }

  return { command: 'fill', selector: inner.selector, value: text };
};

/**
 * FillCommandを正規化
 *
 * 正規化済み形式: { command: 'fill', selector: '...', value: '...' }
 * YAML簡略形式: { fill: { selector: '...', text: '...' } } または { fill: { selector: '...', value: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたFillCommand、または不正な場合null
 */
export const normalizeFillCommand = (value: unknown): RawFillCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawFillCommand | null = checkNormalizedFill(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlFill(obj);
};

/**
 * PressCommandを正規化
 *
 * 正規化済み形式: { command: 'press', key: '...' }
 * YAML簡略形式: { press: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたPressCommand、または不正な場合null
 */
export const normalizePressCommand = (value: unknown): RawPressCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'press' && typeof obj.key === 'string') {
    return { command: 'press', key: obj.key };
  }

  if (hasYamlKey(obj, 'press') && typeof obj.press === 'string') {
    return { command: 'press', key: obj.press };
  }

  return null;
};

/**
 * HoverCommandを正規化
 *
 * 正規化済み形式: { command: 'hover', selector: '...' }
 * YAML簡略形式: { hover: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたHoverCommand、または不正な場合null
 */
export const normalizeHoverCommand = (value: unknown): RawHoverCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'hover' && typeof obj.selector === 'string') {
    return { command: 'hover', selector: obj.selector };
  }

  if (hasYamlKey(obj, 'hover') && typeof obj.hover === 'string') {
    return { command: 'hover', selector: obj.hover };
  }

  return null;
};

/**
 * 正規化済みSelectCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns SelectCommand、または不正な場合null
 */
const checkNormalizedSelect = (obj: Record<string, unknown>): RawSelectCommand | null => {
  if (
    obj.command === 'select' &&
    typeof obj.selector === 'string' &&
    typeof obj.value === 'string'
  ) {
    return { command: 'select', selector: obj.selector, value: obj.value };
  }
  return null;
};

/**
 * YAML簡略形式のSelectCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns SelectCommand、または不正な場合null
 */
const checkYamlSelect = (obj: Record<string, unknown>): RawSelectCommand | null => {
  if (!hasYamlKey(obj, 'select')) {
    return null;
  }

  const inner: Record<string, unknown> | null = toRecord(obj.select);
  if (inner === null || typeof inner.selector !== 'string' || typeof inner.value !== 'string') {
    return null;
  }

  return { command: 'select', selector: inner.selector, value: inner.value };
};

/**
 * SelectCommandを正規化
 *
 * 正規化済み形式: { command: 'select', selector: '...', value: '...' }
 * YAML簡略形式: { select: { selector: '...', value: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたSelectCommand、または不正な場合null
 */
export const normalizeSelectCommand = (value: unknown): RawSelectCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawSelectCommand | null = checkNormalizedSelect(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlSelect(obj);
};

/**
 * 正規化済みScrollCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ScrollCommand、または不正な場合null
 */
/**
 * スクロール方向の型ガード
 */
const isScrollDirection = (value: unknown): value is 'up' | 'down' | 'left' | 'right' => {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right';
};

const checkNormalizedScroll = (obj: Record<string, unknown>): RawScrollCommand | null => {
  if (
    obj.command === 'scroll' &&
    isScrollDirection(obj.direction) &&
    typeof obj.amount === 'number'
  ) {
    return { command: 'scroll', direction: obj.direction, amount: obj.amount };
  }
  return null;
};

/**
 * YAML簡略形式のScrollCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ScrollCommand、または不正な場合null
 */
const checkYamlScroll = (obj: Record<string, unknown>): RawScrollCommand | null => {
  if (!hasYamlKey(obj, 'scroll')) {
    return null;
  }

  const inner: Record<string, unknown> | null = toRecord(obj.scroll);
  if (inner === null || !isScrollDirection(inner.direction) || typeof inner.amount !== 'number') {
    return null;
  }

  return { command: 'scroll', direction: inner.direction, amount: inner.amount };
};

/**
 * ScrollCommandを正規化
 *
 * 正規化済み形式: { command: 'scroll', direction: 'up' | 'down' | 'left' | 'right', amount: number }
 * YAML簡略形式: { scroll: { direction: 'up' | 'down' | 'left' | 'right', amount: number } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたScrollCommand、または不正な場合null
 */
export const normalizeScrollCommand = (value: unknown): RawScrollCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawScrollCommand | null = checkNormalizedScroll(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlScroll(obj);
};

/**
 * ScrollIntoViewCommandを正規化
 *
 * 正規化済み形式: { command: 'scrollIntoView', selector: '...' }
 * YAML簡略形式: { scrollIntoView: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたScrollIntoViewCommand、または不正な場合null
 */
export const normalizeScrollIntoViewCommand = (value: unknown): RawScrollIntoViewCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'scrollIntoView' && typeof obj.selector === 'string') {
    return { command: 'scrollIntoView', selector: obj.selector };
  }

  if (hasYamlKey(obj, 'scrollIntoView') && typeof obj.scrollIntoView === 'string') {
    return { command: 'scrollIntoView', selector: obj.scrollIntoView };
  }

  return null;
};

/**
 * LoadStateの型ガード
 *
 * @param value - 判定対象の値
 * @returns LoadStateの場合true
 */
const isLoadState = (value: unknown): value is LoadState => {
  return value === 'load' || value === 'domcontentloaded' || value === 'networkidle';
};

/**
 * 正規化済みWaitCommandを検証（基本形式）
 *
 * @param obj - 検証対象のオブジェクト
 * @returns WaitCommand、または不正な場合null
 */
const checkNormalizedWaitBasic = (obj: Record<string, unknown>): RawWaitCommand | null => {
  if (obj.command !== 'wait') {
    return null;
  }

  if (typeof obj.ms === 'number') {
    return { command: 'wait', ms: obj.ms };
  }

  if (typeof obj.selector === 'string') {
    return { command: 'wait', selector: obj.selector };
  }

  if (typeof obj.text === 'string') {
    return { command: 'wait', text: obj.text };
  }

  return null;
};

/**
 * 正規化済みWaitCommandを検証（拡張形式）
 *
 * @param obj - 検証対象のオブジェクト
 * @returns WaitCommand、または不正な場合null
 */
const checkNormalizedWaitExtended = (obj: Record<string, unknown>): RawWaitCommand | null => {
  if (obj.command !== 'wait') {
    return null;
  }

  if (isLoadState(obj.load)) {
    return { command: 'wait', load: obj.load };
  }

  if (typeof obj.url === 'string') {
    return { command: 'wait', url: obj.url };
  }

  if (typeof obj.fn === 'string') {
    return { command: 'wait', fn: obj.fn };
  }

  return null;
};

/**
 * 正規化済みWaitCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns WaitCommand、または不正な場合null
 */
const checkNormalizedWait = (obj: Record<string, unknown>): RawWaitCommand | null => {
  return checkNormalizedWaitBasic(obj) ?? checkNormalizedWaitExtended(obj);
};

/**
 * YAML簡略形式のWaitCommandを検証（オブジェクト形式）
 *
 * @param inner - waitオブジェクトの内容
 * @returns WaitCommand、または不正な場合null
 */
const checkYamlWaitObject = (inner: Record<string, unknown>): RawWaitCommand | null => {
  if (typeof inner.text === 'string') {
    return { command: 'wait', text: inner.text };
  }

  if (isLoadState(inner.load)) {
    return { command: 'wait', load: inner.load };
  }

  if (typeof inner.url === 'string') {
    return { command: 'wait', url: inner.url };
  }

  if (typeof inner.fn === 'string') {
    return { command: 'wait', fn: inner.fn };
  }

  return null;
};

/**
 * YAML簡略形式のWaitCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns WaitCommand、または不正な場合null
 */
const checkYamlWait = (obj: Record<string, unknown>): RawWaitCommand | null => {
  if (!hasYamlKey(obj, 'wait')) {
    return null;
  }

  // { wait: number } → ms指定
  if (typeof obj.wait === 'number') {
    return { command: 'wait', ms: obj.wait };
  }

  // { wait: string } → selectorとして扱う
  // agent-browser の wait <selector> と同じ動作（そのまま Playwright に渡す）
  if (typeof obj.wait === 'string') {
    return { command: 'wait', selector: obj.wait };
  }

  // { wait: { text: "...", load: "...", url: "...", fn: "..." } }
  const inner: Record<string, unknown> | null = toRecord(obj.wait);
  if (inner === null) {
    return null;
  }

  return checkYamlWaitObject(inner);
};

/**
 * WaitCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'wait', ms: number }
 * - { command: 'wait', selector: string }
 * - { command: 'wait', text: string }
 * - { command: 'wait', load: LoadState }
 * - { command: 'wait', url: string }
 * - { command: 'wait', fn: string }
 *
 * YAML簡略形式:
 * - { wait: number } → ms指定
 * - { wait: "<selector>" } → selector指定（agent-browserと同じ動作）
 * - { wait: { text: "..." } } → text指定
 * - { wait: { load: "networkidle" } } → load指定
 * - { wait: { url: "..." } } → url指定
 * - { wait: { fn: "..." } } → fn指定
 *
 * @param value - 検証対象の値
 * @returns 正規化されたWaitCommand、または不正な場合null
 */
export const normalizeWaitCommand = (value: unknown): RawWaitCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawWaitCommand | null = checkNormalizedWait(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlWait(obj);
};

/**
 * ScreenshotCommandを構築するヘルパー
 *
 * @param path - スクリーンショットのパス
 * @param full - フルページオプション
 * @returns ScreenshotCommand
 */
const buildScreenshotCommand = (path: string, full: unknown): RawScreenshotCommand => {
  const result: RawScreenshotCommand = {
    command: 'screenshot',
    path,
    full: typeof full === 'boolean' ? full : UseDefault,
  };
  return result;
};

/**
 * YAML簡略形式のscreenshotを正規化
 *
 * @param value - screenshot フィールドの値
 * @returns ScreenshotCommand、または不正な場合null
 */
const normalizeYamlScreenshot = (value: unknown): RawScreenshotCommand | null => {
  // { screenshot: './path.png' }
  if (typeof value === 'string') {
    return { command: 'screenshot', path: value, full: UseDefault };
  }

  // { screenshot: { path: '...', full: true } }
  const inner: Record<string, unknown> | null = toRecord(value);
  if (inner === null || typeof inner.path !== 'string') {
    return null;
  }

  return buildScreenshotCommand(inner.path, inner.full);
};

/**
 * ScreenshotCommandを正規化
 *
 * 正規化済み形式: { command: 'screenshot', path: '...', full?: boolean }
 * YAML簡略形式:
 * - { screenshot: './path.png' }
 * - { screenshot: { path: '...', full: true } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたScreenshotCommand、または不正な場合null
 */
export const normalizeScreenshotCommand = (value: unknown): RawScreenshotCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'screenshot' && typeof obj.path === 'string') {
    return buildScreenshotCommand(obj.path, obj.full);
  }

  if (hasYamlKey(obj, 'screenshot')) {
    return normalizeYamlScreenshot(obj.screenshot);
  }

  return null;
};

/**
 * SnapshotCommandを正規化
 *
 * 正規化済み形式: { command: 'snapshot' }
 * YAML簡略形式: { snapshot: {} } または { snapshot: null }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたSnapshotCommand、または不正な場合null
 */
export const normalizeSnapshotCommand = (value: unknown): RawSnapshotCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  // ts-patternで型安全にマッチング
  return match(obj)
    .with({ command: 'snapshot' }, () => ({ command: 'snapshot' as const }))
    .with({ snapshot: P.any }, (o) =>
      // commandキーがない場合のみYAML簡略形式として認識
      o.command === undefined ? { command: 'snapshot' as const } : null,
    )
    .otherwise(() => null);
};

/**
 * EvalCommandを正規化
 *
 * 正規化済み形式: { command: 'eval', script: '...' }
 * YAML簡略形式: { eval: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたEvalCommand、または不正な場合null
 */
export const normalizeEvalCommand = (value: unknown): RawEvalCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'eval' && typeof obj.script === 'string') {
    return { command: 'eval', script: obj.script };
  }

  if (hasYamlKey(obj, 'eval') && typeof obj.eval === 'string') {
    return { command: 'eval', script: obj.eval };
  }

  return null;
};

/**
 * AssertVisibleCommandを正規化
 *
 * 正規化済み形式: { command: 'assertVisible', selector: '...' }
 * YAML簡略形式: { assertVisible: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたAssertVisibleCommand、または不正な場合null
 */
export const normalizeAssertVisibleCommand = (value: unknown): RawAssertVisibleCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'assertVisible' && typeof obj.selector === 'string') {
    return { command: 'assertVisible', selector: obj.selector };
  }

  if (hasYamlKey(obj, 'assertVisible') && typeof obj.assertVisible === 'string') {
    return { command: 'assertVisible', selector: obj.assertVisible };
  }

  return null;
};

/**
 * AssertNotVisibleCommandを正規化
 *
 * 正規化済み形式: { command: 'assertNotVisible', selector: '...' }
 * YAML簡略形式: { assertNotVisible: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたAssertNotVisibleCommand、または不正な場合null
 */
export const normalizeAssertNotVisibleCommand = (
  value: unknown,
): RawAssertNotVisibleCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'assertNotVisible' && typeof obj.selector === 'string') {
    return { command: 'assertNotVisible', selector: obj.selector };
  }

  if (hasYamlKey(obj, 'assertNotVisible') && typeof obj.assertNotVisible === 'string') {
    return { command: 'assertNotVisible', selector: obj.assertNotVisible };
  }

  return null;
};

/**
 * AssertEnabledCommandを正規化
 *
 * 正規化済み形式: { command: 'assertEnabled', selector: '...' }
 * YAML簡略形式: { assertEnabled: '...' }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたAssertEnabledCommand、または不正な場合null
 */
export const normalizeAssertEnabledCommand = (value: unknown): RawAssertEnabledCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  if (obj.command === 'assertEnabled' && typeof obj.selector === 'string') {
    return { command: 'assertEnabled', selector: obj.selector };
  }

  if (hasYamlKey(obj, 'assertEnabled') && typeof obj.assertEnabled === 'string') {
    return { command: 'assertEnabled', selector: obj.assertEnabled };
  }

  return null;
};

/**
 * AssertCheckedCommandを構築するヘルパー
 *
 * @param selector - セレクタ文字列
 * @param checked - 期待されるチェック状態
 * @returns AssertCheckedCommand、またはcheckedが不正な型の場合null
 */
const buildAssertCheckedCommand = (
  selector: string,
  checked: unknown,
): RawAssertCheckedCommand | null => {
  // checkedが存在し、かつboolean以外の場合は不正
  if (checked !== undefined && typeof checked !== 'boolean') {
    return null;
  }

  const result: RawAssertCheckedCommand = {
    command: 'assertChecked',
    selector,
    checked: typeof checked === 'boolean' ? checked : UseDefault,
  };
  return result;
};

/**
 * 正規化済みAssertCheckedCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertCheckedCommand、または不正な場合null
 */
const checkNormalizedAssertChecked = (
  obj: Record<string, unknown>,
): RawAssertCheckedCommand | null => {
  if (obj.command === 'assertChecked' && typeof obj.selector === 'string') {
    return buildAssertCheckedCommand(obj.selector, obj.checked);
  }
  return null;
};

/**
 * YAML簡略形式のAssertCheckedCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertCheckedCommand、または不正な場合null
 */
const checkYamlAssertChecked = (obj: Record<string, unknown>): RawAssertCheckedCommand | null => {
  if (!hasYamlKey(obj, 'assertChecked')) {
    return null;
  }

  // { assertChecked: 'セレクタ' }
  if (typeof obj.assertChecked === 'string') {
    return { command: 'assertChecked', selector: obj.assertChecked, checked: UseDefault };
  }

  // { assertChecked: { selector: '...', checked?: boolean } }
  const inner: Record<string, unknown> | null = toRecord(obj.assertChecked);
  if (inner !== null && typeof inner.selector === 'string') {
    return buildAssertCheckedCommand(inner.selector, inner.checked);
  }

  return null;
};

/**
 * AssertCheckedCommandを正規化
 *
 * 正規化済み形式: { command: 'assertChecked', selector: '...', checked?: boolean }
 * YAML簡略形式: { assertChecked: '...' } または { assertChecked: { selector: '...', checked?: boolean } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたAssertCheckedCommand、または不正な場合null
 */
export const normalizeAssertCheckedCommand = (value: unknown): RawAssertCheckedCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawAssertCheckedCommand | null = checkNormalizedAssertChecked(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlAssertChecked(obj);
};

/**
 * 全てのnormalizer関数をまとめた配列
 *
 * validateCommandで順次試行される。
 */
export const normalizers: Array<(value: unknown) => RawCommand | null> = [
  normalizeOpenCommand,
  normalizeClickCommand,
  normalizeTypeCommand,
  normalizeFillCommand,
  normalizePressCommand,
  normalizeHoverCommand,
  normalizeSelectCommand,
  normalizeScrollCommand,
  normalizeScrollIntoViewCommand,
  normalizeWaitCommand,
  normalizeScreenshotCommand,
  normalizeSnapshotCommand,
  normalizeEvalCommand,
  normalizeAssertVisibleCommand,
  normalizeAssertNotVisibleCommand,
  normalizeAssertEnabledCommand,
  normalizeAssertCheckedCommand,
];
