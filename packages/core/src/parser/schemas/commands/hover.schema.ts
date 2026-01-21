/**
 * Hoverコマンドスキーマ定義
 *
 * YAML入力形式のhoverコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 簡略形式: hover: "テキスト" → { command: 'hover', text: TextSelector }
 * - 詳細形式: hover: { css: "..." } → { command: 'hover', css: CssSelector }
 *
 * Single Source of Truth:
 * - HoverYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - HoverCommand: スキーマから導出されるBranded Type
 */

import * as v from 'valibot';
import {
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
  type InteractableTextSelector,
  type CssSelector,
  type XpathSelector,
} from '@packages/agent-browser-adapter';
import {
  InteractableSelectorSpecSchema,
  type InteractableSelectorSpecOutput,
} from '../selector.schema';

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * HoverCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type HoverWithInteractableText = { command: 'hover'; interactableText: InteractableTextSelector };
type HoverWithCss = { command: 'hover'; css: CssSelector };
type HoverWithXpath = { command: 'hover'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * hover: "テキスト" → { command: 'hover', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const HoverShorthandSchema = v.pipe(
  v.object({
    hover: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['ログイン', 'メニュー'] }),
    ),
  }),
  v.metadata({
    description: 'テキストで要素を指定してホバー',
  }),
  v.transform(
    (input): HoverWithInteractableText => ({
      command: 'hover',
      interactableText: input.hover,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * hover: { css: "..." } → { command: 'hover', css: CssSelector }
 * hover: { interactableText: "..." } → { command: 'hover', interactableText: InteractableTextSelector }
 * hover: { xpath: "..." } → { command: 'hover', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const HoverDetailedSchema = v.pipe(
  v.object({
    hover: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'セレクタで要素を指定してホバー',
  }),
  v.transform((input): HoverWithCss | HoverWithInteractableText | HoverWithXpath => {
    const selector: InteractableSelectorSpecOutput = input.hover;
    const result: HoverWithCss | HoverWithInteractableText | HoverWithXpath = {
      command: 'hover',
      ...selector,
    };
    return result;
  }),
);

/**
 * HoverコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はHoverCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const HoverYamlSchema = v.pipe(
  v.union([HoverShorthandSchema, HoverDetailedSchema]),
  v.description('要素にホバーする'),
  v.metadata({ category: 'インタラクション' }),
);

/**
 * HoverYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type HoverYamlInput = v.InferInput<typeof HoverYamlSchema>;

/**
 * HoverCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type HoverCommand = v.InferOutput<typeof HoverYamlSchema>;
