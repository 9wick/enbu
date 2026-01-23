/**
 * スクロールコマンドスキーマ定義
 *
 * YAML入力形式のscrollコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - scroll: { direction: 'up' | 'down' | 'left' | 'right', amount: number }
 *   → { command: 'scroll', direction: ..., amount: number }
 *
 * Single Source of Truth:
 * - ScrollYamlSchema: Runtime版スキーマ（transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - ScrollCommand: スキーマから導出される型
 */

import * as v from 'valibot';

/**
 * スクロール方向のリテラルユニオン
 */
const ScrollDirectionSchema = v.pipe(
  v.picklist(['up', 'down', 'left', 'right']),
  v.description('Scroll direction'),
);

/**
 * ScrollコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 詳細形式のみ対応（direction + amount必須）。
 * scroll: { direction: 'up' | 'down' | 'left' | 'right', amount: number }
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const ScrollYamlSchema = v.pipe(
  v.object({
    scroll: v.pipe(
      v.object({
        direction: ScrollDirectionSchema,
        amount: v.pipe(
          v.number(),
          v.description('Scroll amount (pixels)'),
          v.metadata({ exampleValues: [100, 500] }),
        ),
      }),
      v.metadata({
        exampleValues: [
          { direction: 'down', amount: 300 },
          { direction: 'up', amount: 100 },
        ],
      }),
    ),
  }),
  v.description('ページをスクロールする'),
  v.metadata({ category: 'Navigation' }),
  v.transform(
    (
      input,
    ): { command: 'scroll'; direction: 'up' | 'down' | 'left' | 'right'; amount: number } => ({
      command: 'scroll',
      direction: input.scroll.direction,
      amount: input.scroll.amount,
    }),
  ),
);

/**
 * ScrollYamlSchemaの入力型
 */
export type ScrollYamlInput = v.InferInput<typeof ScrollYamlSchema>;

/**
 * ScrollCommand型（Single Source of Truth）
 */
export type ScrollCommand = v.InferOutput<typeof ScrollYamlSchema>;
