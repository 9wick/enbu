/**
 * agent-browser CLI出力のvalibotスキーマ定義
 *
 * 外部CLI（agent-browser）の出力を厳密に検証するためのスキーマ。
 * 各コマンドのdataフィールドの型を定義する。
 *
 * 注意: {success, data, error}の共通構造はvalidator.ts内で処理され、
 * 外部には data の型のみがエクスポートされる。
 */

import * as v from 'valibot';

// ==========================================
// コマンド別データスキーマ（検証用・内部）
// ==========================================

/**
 * open コマンドのデータスキーマ
 */
export const OpenDataSchema = v.object({
  url: v.string(),
});

/**
 * 単純操作コマンドのデータスキーマ（空オブジェクト）
 *
 * click, type, fill, hover, focus, scrollintoview, press, select, scroll, wait, close
 */
export const EmptyDataSchema = v.object({});

/**
 * screenshot コマンドのデータスキーマ
 */
export const ScreenshotDataSchema = v.object({
  path: v.string(),
});

/**
 * snapshot コマンドの参照要素スキーマ
 */
const SnapshotRefSchema = v.object({
  name: v.string(),
  role: v.string(),
});

/**
 * snapshot コマンドのデータスキーマ
 */
export const SnapshotDataSchema = v.object({
  snapshot: v.string(),
  refs: v.record(v.string(), SnapshotRefSchema),
});

/**
 * eval コマンドのデータスキーマ
 */
export const EvalDataSchema = v.object({
  result: v.unknown(),
});

/**
 * is visible コマンドのデータスキーマ
 */
export const IsVisibleDataSchema = v.object({
  visible: v.boolean(),
});

/**
 * is enabled コマンドのデータスキーマ
 */
export const IsEnabledDataSchema = v.object({
  enabled: v.boolean(),
});

/**
 * is checked コマンドのデータスキーマ
 */
export const IsCheckedDataSchema = v.object({
  checked: v.boolean(),
});

// ==========================================
// エクスポート用データ型（外部公開）
// ==========================================

/** open コマンドの戻り値データ型 */
export type OpenData = v.InferOutput<typeof OpenDataSchema>;

/** 単純操作コマンドの戻り値データ型（空オブジェクト） */
export type EmptyData = v.InferOutput<typeof EmptyDataSchema>;

/** screenshot コマンドの戻り値データ型 */
export type ScreenshotData = v.InferOutput<typeof ScreenshotDataSchema>;

/** snapshot コマンドの戻り値データ型 */
export type SnapshotData = v.InferOutput<typeof SnapshotDataSchema>;

/** eval コマンドの戻り値データ型 */
export type EvalData = v.InferOutput<typeof EvalDataSchema>;

/** is visible コマンドの戻り値データ型 */
export type IsVisibleData = v.InferOutput<typeof IsVisibleDataSchema>;

/** is enabled コマンドの戻り値データ型 */
export type IsEnabledData = v.InferOutput<typeof IsEnabledDataSchema>;

/** is checked コマンドの戻り値データ型 */
export type IsCheckedData = v.InferOutput<typeof IsCheckedDataSchema>;
