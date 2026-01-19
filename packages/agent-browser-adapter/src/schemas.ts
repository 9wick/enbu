/**
 * agent-browser CLI出力のvalibotスキーマ定義
 *
 * 外部CLI（agent-browser）の出力を厳密に検証するためのスキーマ。
 * 各コマンドの出力形式に対応したスキーマを定義する。
 */

import * as v from 'valibot';

// ==========================================
// 共通スキーマ
// ==========================================

/**
 * agent-browserの--json出力の共通構造を生成するファクトリ関数
 *
 * 全てのコマンドは { success, data, error } の形式で出力する
 */
const createAgentBrowserOutputSchema = <
  T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  dataSchema: T,
) =>
  v.object({
    success: v.boolean(),
    data: v.nullable(dataSchema),
    error: v.nullable(v.string()),
  });

// ==========================================
// コマンド別出力スキーマ
// ==========================================

/**
 * open コマンドの出力データスキーマ
 *
 * 成功時: { url: string }
 */
export const OpenOutputDataSchema = v.object({
  url: v.string(),
});
export const OpenOutputSchema = createAgentBrowserOutputSchema(OpenOutputDataSchema);
export type OpenOutput = v.InferOutput<typeof OpenOutputSchema>;

/**
 * 単純操作コマンドの出力データスキーマ
 *
 * click, type, fill, hover, focus, scrollintoview など
 * 成功時: {} (空オブジェクト)
 */
export const EmptyDataSchema = v.object({});
export const SimpleActionOutputSchema = createAgentBrowserOutputSchema(EmptyDataSchema);
export type SimpleActionOutput = v.InferOutput<typeof SimpleActionOutputSchema>;

/**
 * press コマンドの出力
 */
export const PressOutputSchema = SimpleActionOutputSchema;
export type PressOutput = v.InferOutput<typeof PressOutputSchema>;

/**
 * select コマンドの出力
 */
export const SelectOutputSchema = SimpleActionOutputSchema;
export type SelectOutput = v.InferOutput<typeof SelectOutputSchema>;

/**
 * scroll コマンドの出力
 */
export const ScrollOutputSchema = SimpleActionOutputSchema;
export type ScrollOutput = v.InferOutput<typeof ScrollOutputSchema>;

/**
 * wait コマンドの出力
 */
export const WaitOutputSchema = SimpleActionOutputSchema;
export type WaitOutput = v.InferOutput<typeof WaitOutputSchema>;

/**
 * screenshot コマンドの出力データスキーマ
 *
 * 成功時: { path: string }
 */
export const ScreenshotOutputDataSchema = v.object({
  path: v.string(),
});
export const ScreenshotOutputSchema = createAgentBrowserOutputSchema(ScreenshotOutputDataSchema);
export type ScreenshotOutput = v.InferOutput<typeof ScreenshotOutputSchema>;

/**
 * snapshot コマンドの参照要素スキーマ
 */
export const SnapshotRefSchema = v.object({
  name: v.string(),
  role: v.string(),
});

/**
 * snapshot コマンドの出力データスキーマ
 *
 * 成功時: { snapshot: string, refs: Record<string, { name, role }> }
 */
export const SnapshotOutputDataSchema = v.object({
  snapshot: v.string(),
  refs: v.record(v.string(), SnapshotRefSchema),
});
export const SnapshotOutputSchema = createAgentBrowserOutputSchema(SnapshotOutputDataSchema);
export type SnapshotOutput = v.InferOutput<typeof SnapshotOutputSchema>;

/**
 * eval コマンドの出力データスキーマ
 *
 * 成功時: { result: unknown } - evalの結果は任意の値
 */
export const EvalOutputDataSchema = v.object({
  result: v.unknown(),
});
export const EvalOutputSchema = createAgentBrowserOutputSchema(EvalOutputDataSchema);
export type EvalOutput = v.InferOutput<typeof EvalOutputSchema>;

/**
 * is visible コマンドの出力データスキーマ
 */
export const IsVisibleOutputDataSchema = v.object({
  visible: v.boolean(),
});
export const IsVisibleOutputSchema = createAgentBrowserOutputSchema(IsVisibleOutputDataSchema);
export type IsVisibleOutput = v.InferOutput<typeof IsVisibleOutputSchema>;

/**
 * is enabled コマンドの出力データスキーマ
 */
export const IsEnabledOutputDataSchema = v.object({
  enabled: v.boolean(),
});
export const IsEnabledOutputSchema = createAgentBrowserOutputSchema(IsEnabledOutputDataSchema);
export type IsEnabledOutput = v.InferOutput<typeof IsEnabledOutputSchema>;

/**
 * is checked コマンドの出力データスキーマ
 */
export const IsCheckedOutputDataSchema = v.object({
  checked: v.boolean(),
});
export const IsCheckedOutputSchema = createAgentBrowserOutputSchema(IsCheckedOutputDataSchema);
export type IsCheckedOutput = v.InferOutput<typeof IsCheckedOutputSchema>;

/**
 * close コマンドの出力
 */
export const CloseOutputSchema = SimpleActionOutputSchema;
export type CloseOutput = v.InferOutput<typeof CloseOutputSchema>;
