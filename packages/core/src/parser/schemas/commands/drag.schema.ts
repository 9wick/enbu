/**
 * Dragコマンドスキーマ定義
 *
 * YAML入力形式のdragコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 詳細形式: drag: { source: { css: "..." }, target: { css: "..." } }
 * - 詳細形式: drag: { source: { text: "..." }, target: { text: "..." } }
 * - 詳細形式: drag: { source: { xpath: "..." }, target: { xpath: "..." } }
 *
 * Single Source of Truth:
 * - DragYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - DragCommand: スキーマから導出されるBranded Type
 */

import {
  type CssSelector,
  type InteractableTextSelector,
  type XpathSelector,
} from '@packages/agent-browser-adapter';
import * as v from 'valibot';
import {
  type InteractableSelectorSpecOutput,
  InteractableSelectorSpecSchema,
} from '../selector.schema';

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * DragCommandは大きなunion型なので、transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type DragWithCss = {
  command: 'drag';
  source: { css: CssSelector };
  target: { css: CssSelector };
};
type DragWithInteractableText = {
  command: 'drag';
  source: { interactableText: InteractableTextSelector };
  target: { interactableText: InteractableTextSelector };
};
type DragWithXpath = {
  command: 'drag';
  source: { xpath: XpathSelector };
  target: { xpath: XpathSelector };
};
type DragWithMixed = {
  command: 'drag';
  source: InteractableSelectorSpecOutput;
  target: InteractableSelectorSpecOutput;
};

/**
 * 詳細形式スキーマ
 *
 * drag: { source: { css: "..." }, target: { css: "..." } }
 * drag: { source: { text: "..." }, target: { text: "..." } }
 * drag: { source: { xpath: "..." }, target: { xpath: "..." } }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const DragDetailedSchema = v.pipe(
  v.object({
    drag: v.object({
      source: v.pipe(
        InteractableSelectorSpecSchema,
        v.metadata({
          description: 'ドラッグ元要素のセレクタ',
        }),
      ),
      target: v.pipe(
        InteractableSelectorSpecSchema,
        v.metadata({
          description: 'ドロップ先要素のセレクタ',
        }),
      ),
    }),
  }),
  v.metadata({
    description: 'Drag element from source to target',
  }),
  v.transform((input): DragWithCss | DragWithInteractableText | DragWithXpath | DragWithMixed => ({
    command: 'drag',
    source: input.drag.source,
    target: input.drag.target,
  })),
);

/**
 * DragコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 詳細形式のみを受け付ける（dragは2つのセレクタが必要なため簡略形式はない）。
 * 出力型はDragCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const DragYamlSchema = v.pipe(
  DragDetailedSchema,
  v.description('要素をドラッグ&ドロップする'),
  v.metadata({ category: 'Interaction' }),
);

/**
 * DragYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type DragYamlInput = v.InferInput<typeof DragYamlSchema>;

/**
 * DragCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type DragCommand = v.InferOutput<typeof DragYamlSchema>;
