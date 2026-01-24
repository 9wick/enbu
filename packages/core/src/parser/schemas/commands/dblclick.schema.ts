/**
 * Dblclickコマンドスキーマ定義
 *
 * YAML入力形式のdblclickコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 簡略形式: dblclick: "テキスト" → { command: 'dblclick', text: TextSelector }
 * - 詳細形式: dblclick: { css: "..." } → { command: 'dblclick', css: CssSelector }
 *
 * Single Source of Truth:
 * - DblclickYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - DblclickCommand: スキーマから導出されるBranded Type
 */

import {
  type CssSelector,
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
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
 * DblclickCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type DblclickWithInteractableText = {
  command: 'dblclick';
  interactableText: InteractableTextSelector;
};
type DblclickWithCss = { command: 'dblclick'; css: CssSelector };
type DblclickWithXpath = { command: 'dblclick'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * dblclick: "テキスト" → { command: 'dblclick', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const DblclickShorthandSchema = v.pipe(
  v.object({
    dblclick: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['Login', 'Submit button'] }),
    ),
  }),
  v.metadata({
    description: 'Double click on element specified by text',
  }),
  v.transform(
    (input): DblclickWithInteractableText => ({
      command: 'dblclick',
      interactableText: input.dblclick,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * dblclick: { css: "..." } → { command: 'dblclick', css: CssSelector }
 * dblclick: { interactableText: "..." } → { command: 'dblclick', interactableText: InteractableTextSelector }
 * dblclick: { xpath: "..." } → { command: 'dblclick', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const DblclickDetailedSchema = v.pipe(
  v.object({
    dblclick: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'Double click on element specified by selector',
  }),
  v.transform((input): DblclickWithCss | DblclickWithInteractableText | DblclickWithXpath => {
    const selector: InteractableSelectorSpecOutput = input.dblclick;
    const result: DblclickWithCss | DblclickWithInteractableText | DblclickWithXpath = {
      command: 'dblclick',
      ...selector,
    };
    return result;
  }),
);

/**
 * DblclickコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はDblclickCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const DblclickYamlSchema = v.pipe(
  v.union([DblclickShorthandSchema, DblclickDetailedSchema]),
  v.description('要素をダブルクリックする'),
  v.metadata({ category: 'Interaction' }),
);

/**
 * DblclickYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type DblclickYamlInput = v.InferInput<typeof DblclickYamlSchema>;

/**
 * DblclickCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type DblclickCommand = v.InferOutput<typeof DblclickYamlSchema>;
