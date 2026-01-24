/**
 * Focusコマンドスキーマ定義
 *
 * YAML入力形式のfocusコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 簡略形式: focus: "テキスト" → { command: 'focus', text: TextSelector }
 * - 詳細形式: focus: { css: "..." } → { command: 'focus', css: CssSelector }
 *
 * Single Source of Truth:
 * - FocusYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - FocusCommand: スキーマから導出されるBranded Type
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
 * FocusCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type FocusWithInteractableText = { command: 'focus'; interactableText: InteractableTextSelector };
type FocusWithCss = { command: 'focus'; css: CssSelector };
type FocusWithXpath = { command: 'focus'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * focus: "テキスト" → { command: 'focus', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const FocusShorthandSchema = v.pipe(
  v.object({
    focus: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['入力欄ラベル', 'Email field'] }),
    ),
  }),
  v.metadata({
    description: 'Focus on element specified by text',
  }),
  v.transform(
    (input): FocusWithInteractableText => ({
      command: 'focus',
      interactableText: input.focus,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * focus: { css: "..." } → { command: 'focus', css: CssSelector }
 * focus: { interactableText: "..." } → { command: 'focus', interactableText: InteractableTextSelector }
 * focus: { xpath: "..." } → { command: 'focus', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const FocusDetailedSchema = v.pipe(
  v.object({
    focus: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'Focus on element specified by selector',
  }),
  v.transform((input): FocusWithCss | FocusWithInteractableText | FocusWithXpath => {
    const selector: InteractableSelectorSpecOutput = input.focus;
    const result: FocusWithCss | FocusWithInteractableText | FocusWithXpath = {
      command: 'focus',
      ...selector,
    };
    return result;
  }),
);

/**
 * FocusコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はFocusCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const FocusYamlSchema = v.pipe(
  v.union([FocusShorthandSchema, FocusDetailedSchema]),
  v.description('要素にフォーカスを当てる'),
  v.metadata({ category: 'Interaction' }),
);

/**
 * FocusYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type FocusYamlInput = v.InferInput<typeof FocusYamlSchema>;

/**
 * FocusCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type FocusCommand = v.InferOutput<typeof FocusYamlSchema>;
