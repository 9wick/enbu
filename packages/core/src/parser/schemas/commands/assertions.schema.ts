/**
 * Assert系コマンドスキーマ定義
 *
 * YAML入力形式のassert系コマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - assertVisible: 要素が表示されていることを検証
 * - assertNotVisible: 要素が非表示であることを検証
 * - assertEnabled: 要素が有効であることを検証
 * - assertChecked: チェックボックス/ラジオボタンの状態を検証
 *
 * 各コマンドの形式:
 * - 簡略形式: assertVisible: "テキスト" → { command: 'assertVisible', text: TextSelector }
 * - 詳細形式: assertVisible: { css: "..." } → { command: 'assertVisible', css: CssSelector }
 *
 * assertCheckedは特殊ケース:
 * - checkedフィールドがあり、boolean | UseDefaultを取る
 * - 簡略形式でchecked省略時はUseDefaultになる
 *
 * Single Source of Truth:
 * - 各Assert*YamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - Assert*Command: スキーマから導出されるBranded Type
 */

import {
  AnyTextSelectorSchema as AnyTextBrandedSchema,
  type AnyTextSelector,
  type CssSelector,
  CssSelectorSchema,
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
  type InteractableTextSelector,
  type XpathSelector,
  XpathSelectorSchema,
} from '@packages/agent-browser-adapter';
import * as v from 'valibot';
import { UseDefault } from '../../../types/utility-types';
import {
  type AnySelectorSpecOutput,
  AnySelectorSpecSchema,
  type InteractableSelectorSpecOutput,
  InteractableSelectorSpecSchema,
} from '../selector.schema';

// ============================================================================
// AssertVisible
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * AssertVisibleCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type AssertVisibleWithAnyText = { command: 'assertVisible'; anyText: AnyTextSelector };
type AssertVisibleWithCss = { command: 'assertVisible'; css: CssSelector };
type AssertVisibleWithXpath = { command: 'assertVisible'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * assertVisible: "テキスト" → { command: 'assertVisible', anyText: AnyTextSelector }
 * 文字列を直接指定した場合、全要素をテキスト検索として解釈する。
 * AnyTextSelectorとしてBranded Type化される。
 */
const AssertVisibleShorthandSchema = v.pipe(
  v.object({
    assertVisible: v.pipe(
      AnyTextBrandedSchema,
      v.metadata({ exampleValues: ['Login button', 'Submit completed'] }),
    ),
  }),
  v.metadata({
    description: 'テキストで要素を指定して表示を検証',
  }),
  v.transform(
    (input): AssertVisibleWithAnyText => ({
      command: 'assertVisible',
      anyText: input.assertVisible,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * assertVisible: { css: "..." } → { command: 'assertVisible', css: CssSelector }
 * assertVisible: { anyText: "..." } → { command: 'assertVisible', anyText: AnyTextSelector }
 * assertVisible: { xpath: "..." } → { command: 'assertVisible', xpath: XpathSelector }
 *
 * AnySelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const AssertVisibleDetailedSchema = v.pipe(
  v.object({
    assertVisible: AnySelectorSpecSchema,
  }),
  v.metadata({
    description: 'セレクタで要素を指定して表示を検証',
  }),
  v.transform((input): AssertVisibleWithCss | AssertVisibleWithAnyText | AssertVisibleWithXpath => {
    const selector: AnySelectorSpecOutput = input.assertVisible;
    const result: AssertVisibleWithCss | AssertVisibleWithAnyText | AssertVisibleWithXpath = {
      command: 'assertVisible',
      ...selector,
    };
    return result;
  }),
);

/**
 * AssertVisibleコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はAssertVisibleCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const AssertVisibleYamlSchema = v.pipe(
  v.union([AssertVisibleShorthandSchema, AssertVisibleDetailedSchema]),
  v.description('要素が表示されていることを検証する'),
  v.metadata({ category: 'Assertion' }),
);

/**
 * AssertVisibleYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type AssertVisibleYamlInput = v.InferInput<typeof AssertVisibleYamlSchema>;

/**
 * AssertVisibleCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type AssertVisibleCommand = v.InferOutput<typeof AssertVisibleYamlSchema>;

// ============================================================================
// AssertNotVisible
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type。
 */
type AssertNotVisibleWithAnyText = { command: 'assertNotVisible'; anyText: AnyTextSelector };
type AssertNotVisibleWithCss = { command: 'assertNotVisible'; css: CssSelector };
type AssertNotVisibleWithXpath = { command: 'assertNotVisible'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * assertNotVisible: "テキスト" → { command: 'assertNotVisible', anyText: AnyTextSelector }
 * 文字列を直接指定した場合、全要素をテキスト検索として解釈する。
 * AnyTextSelectorとしてBranded Type化される。
 */
const AssertNotVisibleShorthandSchema = v.pipe(
  v.object({
    assertNotVisible: v.pipe(
      AnyTextBrandedSchema,
      v.metadata({ exampleValues: ['Error message', 'Hidden element'] }),
    ),
  }),
  v.metadata({
    description: 'テキストで要素を指定して非表示を検証',
  }),
  v.transform(
    (input): AssertNotVisibleWithAnyText => ({
      command: 'assertNotVisible',
      anyText: input.assertNotVisible,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * assertNotVisible: { css: "..." } → { command: 'assertNotVisible', css: CssSelector }
 * assertNotVisible: { anyText: "..." } → { command: 'assertNotVisible', anyText: AnyTextSelector }
 * assertNotVisible: { xpath: "..." } → { command: 'assertNotVisible', xpath: XpathSelector }
 *
 * AnySelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const AssertNotVisibleDetailedSchema = v.pipe(
  v.object({
    assertNotVisible: AnySelectorSpecSchema,
  }),
  v.metadata({
    description: 'セレクタで要素を指定して非表示を検証',
  }),
  v.transform(
    (input): AssertNotVisibleWithCss | AssertNotVisibleWithAnyText | AssertNotVisibleWithXpath => {
      const selector: AnySelectorSpecOutput = input.assertNotVisible;
      const result:
        | AssertNotVisibleWithCss
        | AssertNotVisibleWithAnyText
        | AssertNotVisibleWithXpath = {
        command: 'assertNotVisible',
        ...selector,
      };
      return result;
    },
  ),
);

/**
 * AssertNotVisibleコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はAssertNotVisibleCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const AssertNotVisibleYamlSchema = v.pipe(
  v.union([AssertNotVisibleShorthandSchema, AssertNotVisibleDetailedSchema]),
  v.description('要素が非表示であることを検証する'),
  v.metadata({ category: 'Assertion' }),
);

/**
 * AssertNotVisibleYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type AssertNotVisibleYamlInput = v.InferInput<typeof AssertNotVisibleYamlSchema>;

/**
 * AssertNotVisibleCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type AssertNotVisibleCommand = v.InferOutput<typeof AssertNotVisibleYamlSchema>;

// ============================================================================
// AssertEnabled
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type。
 */
type AssertEnabledWithInteractableText = {
  command: 'assertEnabled';
  interactableText: InteractableTextSelector;
};
type AssertEnabledWithCss = { command: 'assertEnabled'; css: CssSelector };
type AssertEnabledWithXpath = { command: 'assertEnabled'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * assertEnabled: "テキスト" → { command: 'assertEnabled', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const AssertEnabledShorthandSchema = v.pipe(
  v.object({
    assertEnabled: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['Submit button', 'Input field'] }),
    ),
  }),
  v.metadata({
    description: 'テキストで要素を指定して有効を検証',
  }),
  v.transform(
    (input): AssertEnabledWithInteractableText => ({
      command: 'assertEnabled',
      interactableText: input.assertEnabled,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * assertEnabled: { css: "..." } → { command: 'assertEnabled', css: CssSelector }
 * assertEnabled: { interactableText: "..." } → { command: 'assertEnabled', interactableText: InteractableTextSelector }
 * assertEnabled: { xpath: "..." } → { command: 'assertEnabled', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const AssertEnabledDetailedSchema = v.pipe(
  v.object({
    assertEnabled: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'セレクタで要素を指定して有効を検証',
  }),
  v.transform(
    (input): AssertEnabledWithCss | AssertEnabledWithInteractableText | AssertEnabledWithXpath => {
      const selector: InteractableSelectorSpecOutput = input.assertEnabled;
      const result:
        | AssertEnabledWithCss
        | AssertEnabledWithInteractableText
        | AssertEnabledWithXpath = {
        command: 'assertEnabled',
        ...selector,
      };
      return result;
    },
  ),
);

/**
 * AssertEnabledコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はAssertEnabledCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const AssertEnabledYamlSchema = v.pipe(
  v.union([AssertEnabledShorthandSchema, AssertEnabledDetailedSchema]),
  v.description('要素が有効であることを検証する'),
  v.metadata({ category: 'Assertion' }),
);

/**
 * AssertEnabledYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type AssertEnabledYamlInput = v.InferInput<typeof AssertEnabledYamlSchema>;

/**
 * AssertEnabledCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type AssertEnabledCommand = v.InferOutput<typeof AssertEnabledYamlSchema>;

// ============================================================================
// AssertChecked
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * AssertCheckedはcheckedフィールドを持つ特殊ケース。
 * checkedフィールドは boolean | UseDefault を取る。
 *
 * 全てBranded Type。
 */
type AssertCheckedWithInteractableText = {
  command: 'assertChecked';
  interactableText: InteractableTextSelector;
  checked: boolean | UseDefault;
};
type AssertCheckedWithCss = {
  command: 'assertChecked';
  css: CssSelector;
  checked: boolean | UseDefault;
};
type AssertCheckedWithXpath = {
  command: 'assertChecked';
  xpath: XpathSelector;
  checked: boolean | UseDefault;
};

/**
 * 簡略形式スキーマ
 *
 * assertChecked: "テキスト" → { command: 'assertChecked', interactableText: InteractableTextSelector, checked: UseDefault }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * checkedフィールドは省略されるため、UseDefaultになる。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const AssertCheckedShorthandSchema = v.pipe(
  v.object({
    assertChecked: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['Agree to terms', 'Enable email notifications'] }),
    ),
  }),
  v.metadata({
    description: 'テキストで要素を指定してチェック状態を検証',
  }),
  v.transform(
    (input): AssertCheckedWithInteractableText => ({
      command: 'assertChecked',
      interactableText: input.assertChecked,
      checked: UseDefault,
    }),
  ),
);

/**
 * checkedフィールドスキーマ（optional）
 */
const CheckedFieldSchema = v.optional(
  v.pipe(v.boolean(), v.description('期待されるチェック状態（省略時はtrue）')),
);

/**
 * assertChecked: { css: "...", checked?: boolean }
 */
const AssertCheckedCssSchema = v.pipe(
  v.object({
    assertChecked: v.object({
      css: v.pipe(
        CssSelectorSchema,
        v.description('CSSセレクタ形式で要素を指定'),
        v.metadata({ exampleValues: ['#agree-checkbox', '.terms-checkbox'] }),
      ),
      checked: CheckedFieldSchema,
    }),
  }),
  v.metadata({ description: 'CSSセレクタで要素を指定してチェック状態を検証' }),
  v.transform(
    (input): AssertCheckedWithCss => ({
      command: 'assertChecked',
      css: input.assertChecked.css,
      checked: input.assertChecked.checked ?? UseDefault,
    }),
  ),
);

/**
 * assertChecked: { text: "...", checked?: boolean }
 *
 * YAML入力形式は text を使用し、内部で interactableText に変換される。
 */
const AssertCheckedTextSchema = v.pipe(
  v.object({
    assertChecked: v.object({
      text: v.pipe(
        v.string(),
        v.minLength(1, 'textセレクタは空文字列にできません'),
        v.description('テキスト内容で要素を検索'),
        v.metadata({ exampleValues: ['同意する', '通知を有効にする'] }),
      ),
      checked: CheckedFieldSchema,
    }),
  }),
  v.metadata({ description: 'テキストで要素を指定してチェック状態を検証' }),
  v.transform((input): AssertCheckedWithInteractableText => {
    // Branded Typeを適用（InteractableTextBrandedSchemaを通す）
    const parsed = v.parse(InteractableTextBrandedSchema, input.assertChecked.text);
    return {
      command: 'assertChecked',
      interactableText: parsed,
      checked: input.assertChecked.checked ?? UseDefault,
    };
  }),
);

/**
 * assertChecked: { xpath: "...", checked?: boolean }
 */
const AssertCheckedXpathSchema = v.pipe(
  v.object({
    assertChecked: v.object({
      xpath: v.pipe(
        XpathSelectorSchema,
        v.description('XPath形式で要素を指定'),
        v.metadata({ exampleValues: ["//input[@type='checkbox']"] }),
      ),
      checked: CheckedFieldSchema,
    }),
  }),
  v.metadata({ description: 'XPathで要素を指定してチェック状態を検証' }),
  v.transform(
    (input): AssertCheckedWithXpath => ({
      command: 'assertChecked',
      xpath: input.assertChecked.xpath,
      checked: input.assertChecked.checked ?? UseDefault,
    }),
  ),
);

/**
 * 詳細形式スキーマ（union）
 *
 * 3種類のセレクタをunionで組み合わせる。
 * checkedが省略された場合はUseDefaultになる。
 *
 * 注意: text キーを入力として受け入れ、内部で interactableText に変換する。
 */
const AssertCheckedDetailedSchema = v.union([
  AssertCheckedCssSchema,
  AssertCheckedTextSchema,
  AssertCheckedXpathSchema,
]);

/**
 * AssertCheckedコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はAssertCheckedCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const AssertCheckedYamlSchema = v.pipe(
  v.union([AssertCheckedShorthandSchema, AssertCheckedDetailedSchema]),
  v.description('チェックボックス/ラジオボタンの状態を検証する'),
  v.metadata({ category: 'Assertion' }),
);

/**
 * AssertCheckedYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type AssertCheckedYamlInput = v.InferInput<typeof AssertCheckedYamlSchema>;

/**
 * AssertCheckedCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type AssertCheckedCommand = v.InferOutput<typeof AssertCheckedYamlSchema>;
