/**
 * Clickコマンドスキーマ定義
 *
 * YAML入力形式のclickコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 簡略形式: click: "テキスト" → { command: 'click', text: TextSelector }
 * - 詳細形式: click: { css: "..." } → { command: 'click', css: CssSelector }
 *
 * Single Source of Truth:
 * - ClickYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - ClickCommand: スキーマから導出されるBranded Type
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
 * ClickCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type ClickWithInteractableText = { command: 'click'; interactableText: InteractableTextSelector };
type ClickWithCss = { command: 'click'; css: CssSelector };
type ClickWithXpath = { command: 'click'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * click: "テキスト" → { command: 'click', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const ClickShorthandSchema = v.pipe(
  v.object({
    click: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['ログイン', '送信ボタン'] }),
    ),
  }),
  v.metadata({
    description: 'テキストで要素を指定してクリック',
  }),
  v.transform(
    (input): ClickWithInteractableText => ({
      command: 'click',
      interactableText: input.click,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * click: { css: "..." } → { command: 'click', css: CssSelector }
 * click: { interactableText: "..." } → { command: 'click', interactableText: InteractableTextSelector }
 * click: { xpath: "..." } → { command: 'click', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const ClickDetailedSchema = v.pipe(
  v.object({
    click: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'セレクタで要素を指定してクリック',
  }),
  v.transform((input): ClickWithCss | ClickWithInteractableText | ClickWithXpath => {
    const selector: InteractableSelectorSpecOutput = input.click;
    const result: ClickWithCss | ClickWithInteractableText | ClickWithXpath = {
      command: 'click',
      ...selector,
    };
    return result;
  }),
);

/**
 * ClickコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はClickCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const ClickYamlSchema = v.pipe(
  v.union([ClickShorthandSchema, ClickDetailedSchema]),
  v.description('要素をクリックする'),
  v.metadata({ category: 'インタラクション' }),
);

/**
 * ClickYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type ClickYamlInput = v.InferInput<typeof ClickYamlSchema>;

/**
 * ClickCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type ClickCommand = v.InferOutput<typeof ClickYamlSchema>;
