/**
 * コマンド型ガード・正規化関数
 *
 * YAMLからパースされた値を正規化されたRawCommand型に変換する。
 * SelectorSpec形式 (css/ref/text) をサポート。
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
  RawSelectorSpec,
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
 * セレクタフィールドの存在を確認するヘルパー
 *
 * @param obj - チェック対象のオブジェクト
 * @returns [hasCss, hasRef, hasText]
 */
const checkSelectorFields = (obj: Record<string, unknown>): [boolean, boolean, boolean] => {
  return [typeof obj.css === 'string', typeof obj.ref === 'string', typeof obj.text === 'string'];
};

/**
 * セレクタ値を抽出するヘルパー
 *
 * @param obj - 抽出対象のオブジェクト
 * @param hasCss - cssフィールドが存在するか
 * @param hasRef - refフィールドが存在するか
 * @param hasText - textフィールドが存在するか
 * @returns RawSelectorSpec または null
 */
const extractSelectorValue = (
  obj: Record<string, unknown>,
  hasCss: boolean,
  hasRef: boolean,
  hasText: boolean,
): RawSelectorSpec | null => {
  if (hasCss && typeof obj.css === 'string') {
    return { css: obj.css };
  }
  if (hasRef && typeof obj.ref === 'string') {
    return { ref: obj.ref };
  }
  if (hasText && typeof obj.text === 'string') {
    return { text: obj.text };
  }
  return null;
};

/**
 * RawSelectorSpecを抽出する共通ヘルパー
 *
 * オブジェクトから css/ref/text のいずれかを抽出する。
 * 複数指定されている場合や、いずれも存在しない場合はnullを返す。
 *
 * @param obj - 抽出対象のオブジェクト
 * @returns RawSelectorSpec、または抽出できない場合null
 */
const extractRawSelectorSpec = (obj: Record<string, unknown>): RawSelectorSpec | null => {
  const [hasCss, hasRef, hasText] = checkSelectorFields(obj);

  // 複数指定されている場合は不正
  const count = [hasCss, hasRef, hasText].filter(Boolean).length;
  if (count !== 1) {
    return null;
  }

  return extractSelectorValue(obj, hasCss, hasRef, hasText);
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
 * 正規化済みClickCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ClickCommand、または不正な場合null
 */
const checkNormalizedClick = (obj: Record<string, unknown>): RawClickCommand | null => {
  if (obj.command !== 'click') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'click', ...selectorSpec };
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

  // { click: 'テキスト' } → text形式として解釈
  if (typeof obj.click === 'string') {
    return { command: 'click', text: obj.click };
  }

  // { click: { css: '...', ref: '...', text: '...' } }
  const inner: Record<string, unknown> | null = toRecord(obj.click);
  if (inner === null) {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'click', ...selectorSpec };
};

/**
 * ClickCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'click', css: '...' }
 * - { command: 'click', ref: '...' }
 * - { command: 'click', text: '...' }
 *
 * YAML簡略形式:
 * - { click: { css: '...' } }
 * - { click: { ref: '...' } }
 * - { click: { text: '...' } }
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
 * 正規化済みTypeCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns TypeCommand、または不正な場合null
 */
const checkNormalizedType = (obj: Record<string, unknown>): RawTypeCommand | null => {
  if (obj.command !== 'type' || typeof obj.value !== 'string') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'type', value: obj.value, ...selectorSpec };
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
  if (inner === null || typeof inner.value !== 'string') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'type', value: inner.value, ...selectorSpec };
};

/**
 * TypeCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'type', css: '...', value: '...' }
 * - { command: 'type', ref: '...', value: '...' }
 * - { command: 'type', text: '...', value: '...' }
 *
 * YAML簡略形式:
 * - { type: { css: '...', value: '...' } }
 * - { type: { ref: '...', value: '...' } }
 * - { type: { text: '...', value: '...' } }
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
  if (obj.command !== 'fill' || typeof obj.value !== 'string') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'fill', value: obj.value, ...selectorSpec };
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
  if (inner === null || typeof inner.value !== 'string') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'fill', value: inner.value, ...selectorSpec };
};

/**
 * FillCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'fill', css: '...', value: '...' }
 * - { command: 'fill', ref: '...', value: '...' }
 * - { command: 'fill', text: '...', value: '...' }
 *
 * YAML簡略形式:
 * - { fill: { css: '...', value: '...' } }
 * - { fill: { ref: '...', value: '...' } }
 * - { fill: { text: '...', value: '...' } }
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
 * 正規化済みHoverCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns HoverCommand、または不正な場合null
 */
const checkNormalizedHover = (obj: Record<string, unknown>): RawHoverCommand | null => {
  if (obj.command !== 'hover') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'hover', ...selectorSpec };
};

/**
 * YAML簡略形式のHoverCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns HoverCommand、または不正な場合null
 */
const checkYamlHover = (obj: Record<string, unknown>): RawHoverCommand | null => {
  if (!hasYamlKey(obj, 'hover')) {
    return null;
  }

  // { hover: 'テキスト' } → text形式として解釈
  if (typeof obj.hover === 'string') {
    return { command: 'hover', text: obj.hover };
  }

  const inner: Record<string, unknown> | null = toRecord(obj.hover);
  if (inner === null) {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'hover', ...selectorSpec };
};

/**
 * HoverCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'hover', css: '...' }
 * - { command: 'hover', ref: '...' }
 * - { command: 'hover', text: '...' }
 *
 * YAML簡略形式:
 * - { hover: { css: '...' } }
 * - { hover: { ref: '...' } }
 * - { hover: { text: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたHoverCommand、または不正な場合null
 */
export const normalizeHoverCommand = (value: unknown): RawHoverCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawHoverCommand | null = checkNormalizedHover(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlHover(obj);
};

/**
 * 正規化済みSelectCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns SelectCommand、または不正な場合null
 */
const checkNormalizedSelect = (obj: Record<string, unknown>): RawSelectCommand | null => {
  if (obj.command !== 'select' || typeof obj.value !== 'string') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'select', value: obj.value, ...selectorSpec };
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
  if (inner === null || typeof inner.value !== 'string') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'select', value: inner.value, ...selectorSpec };
};

/**
 * SelectCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'select', css: '...', value: '...' }
 * - { command: 'select', ref: '...', value: '...' }
 * - { command: 'select', text: '...', value: '...' }
 *
 * YAML簡略形式:
 * - { select: { css: '...', value: '...' } }
 * - { select: { ref: '...', value: '...' } }
 * - { select: { text: '...', value: '...' } }
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
 * 正規化済みScrollIntoViewCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ScrollIntoViewCommand、または不正な場合null
 */
const checkNormalizedScrollIntoView = (
  obj: Record<string, unknown>,
): RawScrollIntoViewCommand | null => {
  if (obj.command !== 'scrollIntoView') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'scrollIntoView', ...selectorSpec };
};

/**
 * YAML簡略形式のScrollIntoViewCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns ScrollIntoViewCommand、または不正な場合null
 */
const checkYamlScrollIntoView = (obj: Record<string, unknown>): RawScrollIntoViewCommand | null => {
  if (!hasYamlKey(obj, 'scrollIntoView')) {
    return null;
  }

  // { scrollIntoView: 'テキスト' } → text形式として解釈
  if (typeof obj.scrollIntoView === 'string') {
    return { command: 'scrollIntoView', text: obj.scrollIntoView };
  }

  const inner: Record<string, unknown> | null = toRecord(obj.scrollIntoView);
  if (inner === null) {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'scrollIntoView', ...selectorSpec };
};

/**
 * ScrollIntoViewCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'scrollIntoView', css: '...' }
 * - { command: 'scrollIntoView', ref: '...' }
 * - { command: 'scrollIntoView', text: '...' }
 *
 * YAML簡略形式:
 * - { scrollIntoView: { css: '...' } }
 * - { scrollIntoView: { ref: '...' } }
 * - { scrollIntoView: { text: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたScrollIntoViewCommand、または不正な場合null
 */
export const normalizeScrollIntoViewCommand = (value: unknown): RawScrollIntoViewCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawScrollIntoViewCommand | null = checkNormalizedScrollIntoView(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlScrollIntoView(obj);
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

  // ms指定
  if (typeof obj.ms === 'number') {
    return { command: 'wait', ms: obj.ms };
  }

  // SelectorSpec (css/ref/text) の抽出を試みる
  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec !== null) {
    return { command: 'wait', ...selectorSpec };
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
  // SelectorSpec (css/ref/text) の抽出を試みる
  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec !== null) {
    return { command: 'wait', ...selectorSpec };
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

  // { wait: { css: "...", ref: "...", text: "...", load: "...", url: "...", fn: "..." } }
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
 * - { command: 'wait', css: string }
 * - { command: 'wait', ref: string }
 * - { command: 'wait', text: string }
 * - { command: 'wait', load: LoadState }
 * - { command: 'wait', url: string }
 * - { command: 'wait', fn: string }
 *
 * YAML簡略形式:
 * - { wait: number } → ms指定
 * - { wait: { css: "..." } } → cssセレクタ待機
 * - { wait: { ref: "..." } } → ref待機
 * - { wait: { text: "..." } } → text待機
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
 * 正規化済みAssertVisibleCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertVisibleCommand、または不正な場合null
 */
const checkNormalizedAssertVisible = (
  obj: Record<string, unknown>,
): RawAssertVisibleCommand | null => {
  if (obj.command !== 'assertVisible') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'assertVisible', ...selectorSpec };
};

/**
 * YAML簡略形式のAssertVisibleCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertVisibleCommand、または不正な場合null
 */
const checkYamlAssertVisible = (obj: Record<string, unknown>): RawAssertVisibleCommand | null => {
  if (!hasYamlKey(obj, 'assertVisible')) {
    return null;
  }

  // { assertVisible: 'テキスト' } → text形式として解釈
  if (typeof obj.assertVisible === 'string') {
    return { command: 'assertVisible', text: obj.assertVisible };
  }

  const inner: Record<string, unknown> | null = toRecord(obj.assertVisible);
  if (inner === null) {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'assertVisible', ...selectorSpec };
};

/**
 * AssertVisibleCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'assertVisible', css: '...' }
 * - { command: 'assertVisible', ref: '...' }
 * - { command: 'assertVisible', text: '...' }
 *
 * YAML簡略形式:
 * - { assertVisible: { css: '...' } }
 * - { assertVisible: { ref: '...' } }
 * - { assertVisible: { text: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたAssertVisibleCommand、または不正な場合null
 */
export const normalizeAssertVisibleCommand = (value: unknown): RawAssertVisibleCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawAssertVisibleCommand | null = checkNormalizedAssertVisible(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlAssertVisible(obj);
};

/**
 * 正規化済みAssertNotVisibleCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertNotVisibleCommand、または不正な場合null
 */
const checkNormalizedAssertNotVisible = (
  obj: Record<string, unknown>,
): RawAssertNotVisibleCommand | null => {
  if (obj.command !== 'assertNotVisible') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'assertNotVisible', ...selectorSpec };
};

/**
 * YAML簡略形式のAssertNotVisibleCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertNotVisibleCommand、または不正な場合null
 */
const checkYamlAssertNotVisible = (
  obj: Record<string, unknown>,
): RawAssertNotVisibleCommand | null => {
  if (!hasYamlKey(obj, 'assertNotVisible')) {
    return null;
  }

  // { assertNotVisible: 'テキスト' } → text形式として解釈
  if (typeof obj.assertNotVisible === 'string') {
    return { command: 'assertNotVisible', text: obj.assertNotVisible };
  }

  const inner: Record<string, unknown> | null = toRecord(obj.assertNotVisible);
  if (inner === null) {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'assertNotVisible', ...selectorSpec };
};

/**
 * AssertNotVisibleCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'assertNotVisible', css: '...' }
 * - { command: 'assertNotVisible', ref: '...' }
 * - { command: 'assertNotVisible', text: '...' }
 *
 * YAML簡略形式:
 * - { assertNotVisible: { css: '...' } }
 * - { assertNotVisible: { ref: '...' } }
 * - { assertNotVisible: { text: '...' } }
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

  const normalized: RawAssertNotVisibleCommand | null = checkNormalizedAssertNotVisible(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlAssertNotVisible(obj);
};

/**
 * 正規化済みAssertEnabledCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertEnabledCommand、または不正な場合null
 */
const checkNormalizedAssertEnabled = (
  obj: Record<string, unknown>,
): RawAssertEnabledCommand | null => {
  if (obj.command !== 'assertEnabled') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'assertEnabled', ...selectorSpec };
};

/**
 * YAML簡略形式のAssertEnabledCommandを検証
 *
 * @param obj - 検証対象のオブジェクト
 * @returns AssertEnabledCommand、または不正な場合null
 */
const checkYamlAssertEnabled = (obj: Record<string, unknown>): RawAssertEnabledCommand | null => {
  if (!hasYamlKey(obj, 'assertEnabled')) {
    return null;
  }

  // { assertEnabled: 'テキスト' } → text形式として解釈
  if (typeof obj.assertEnabled === 'string') {
    return { command: 'assertEnabled', text: obj.assertEnabled };
  }

  const inner: Record<string, unknown> | null = toRecord(obj.assertEnabled);
  if (inner === null) {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return { command: 'assertEnabled', ...selectorSpec };
};

/**
 * AssertEnabledCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'assertEnabled', css: '...' }
 * - { command: 'assertEnabled', ref: '...' }
 * - { command: 'assertEnabled', text: '...' }
 *
 * YAML簡略形式:
 * - { assertEnabled: { css: '...' } }
 * - { assertEnabled: { ref: '...' } }
 * - { assertEnabled: { text: '...' } }
 *
 * @param value - 検証対象の値
 * @returns 正規化されたAssertEnabledCommand、または不正な場合null
 */
export const normalizeAssertEnabledCommand = (value: unknown): RawAssertEnabledCommand | null => {
  const obj: Record<string, unknown> | null = toRecord(value);
  if (obj === null) {
    return null;
  }

  const normalized: RawAssertEnabledCommand | null = checkNormalizedAssertEnabled(obj);
  if (normalized !== null) {
    return normalized;
  }

  return checkYamlAssertEnabled(obj);
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
  if (obj.command !== 'assertChecked') {
    return null;
  }

  // checkedが存在し、かつboolean以外の場合は不正
  if (obj.checked !== undefined && typeof obj.checked !== 'boolean') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(obj);
  if (selectorSpec === null) {
    return null;
  }

  return {
    command: 'assertChecked',
    checked: typeof obj.checked === 'boolean' ? obj.checked : UseDefault,
    ...selectorSpec,
  };
};

/**
 * YAML簡略形式のAssertCheckedCommand（オブジェクト形式）を検証
 *
 * @param inner - assertCheckedオブジェクトの内容
 * @returns AssertCheckedCommand、または不正な場合null
 */
const checkYamlAssertCheckedObject = (
  inner: Record<string, unknown>,
): RawAssertCheckedCommand | null => {
  // checkedが存在し、かつboolean以外の場合は不正
  if (inner.checked !== undefined && typeof inner.checked !== 'boolean') {
    return null;
  }

  const selectorSpec = extractRawSelectorSpec(inner);
  if (selectorSpec === null) {
    return null;
  }

  return {
    command: 'assertChecked',
    checked: typeof inner.checked === 'boolean' ? inner.checked : UseDefault,
    ...selectorSpec,
  };
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

  // { assertChecked: 'テキスト' } → text形式として解釈（checked=true）
  if (typeof obj.assertChecked === 'string') {
    return { command: 'assertChecked', text: obj.assertChecked, checked: UseDefault };
  }

  const inner: Record<string, unknown> | null = toRecord(obj.assertChecked);
  if (inner === null) {
    return null;
  }

  return checkYamlAssertCheckedObject(inner);
};

/**
 * AssertCheckedCommandを正規化
 *
 * 正規化済み形式:
 * - { command: 'assertChecked', css: '...', checked?: boolean }
 * - { command: 'assertChecked', ref: '...', checked?: boolean }
 * - { command: 'assertChecked', text: '...', checked?: boolean }
 *
 * YAML簡略形式:
 * - { assertChecked: { css: '...', checked?: boolean } }
 * - { assertChecked: { ref: '...', checked?: boolean } }
 * - { assertChecked: { text: '...', checked?: boolean } }
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
