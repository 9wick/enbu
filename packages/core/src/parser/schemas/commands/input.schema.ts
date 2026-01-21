/**
 * 入力系コマンドスキーマ定義
 *
 * YAML入力形式のtype/fill/selectコマンドをvalibotで検証・変換する。
 *
 * これらのコマンドはセレクタ + valueフィールドを持つ共通パターン。
 * 各セレクタタイプごとにスキーマを定義し、unionで組み合わせる。
 *
 * 対応形式:
 * - type: { css: "...", value: "..." } → { command: 'type', css: CssSelector, value: '...' }
 * - fill: { css: "...", value: "..." } → { command: 'fill', css: CssSelector, value: '...' }
 * - select: { css: "...", value: "..." } → { command: 'select', css: CssSelector, value: '...' }
 *
 * Single Source of Truth:
 * - 各*YamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - TypeCommand, FillCommand, SelectCommand: スキーマから導出されるBranded Type
 */

import * as v from 'valibot';
import {
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
  type InteractableTextSelector,
  type CssSelector,
  type XpathSelector,
  CssSelectorSchema,
  XpathSelectorSchema,
} from '@packages/agent-browser-adapter';

// ============================================================================
// TypeCommand
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type + value。
 */
type TypeWithCss = { command: 'type'; css: CssSelector; value: string };
type TypeWithInteractableText = {
  command: 'type';
  interactableText: InteractableTextSelector;
  value: string;
};
type TypeWithXpath = { command: 'type'; xpath: XpathSelector; value: string };

/**
 * valueフィールドスキーマ（type用）
 */
const TypeValueSchema = v.pipe(
  v.string(),
  v.description('入力するテキスト'),
  v.metadata({ exampleValues: ['ユーザー名', 'test@example.com'] }),
);

/**
 * type: { css: "...", value: "..." }
 */
const TypeCssSchema = v.pipe(
  v.object({
    type: v.object({
      css: v.pipe(
        CssSelectorSchema,
        v.description('CSSセレクタ形式で要素を指定'),
        v.metadata({ exampleValues: ['#username', '.email-input'] }),
      ),
      value: TypeValueSchema,
    }),
  }),
  v.metadata({ description: 'CSSセレクタで要素を指定して入力' }),
  v.transform(
    (input): TypeWithCss => ({
      command: 'type',
      css: input.type.css,
      value: input.type.value,
    }),
  ),
);

/**
 * type: { interactableText: "...", value: "..." }
 */
const TypeInteractableTextSchema = v.pipe(
  v.object({
    type: v.object({
      interactableText: v.pipe(
        InteractableTextBrandedSchema,
        v.description('インタラクティブ要素をテキスト内容で検索'),
        v.metadata({ exampleValues: ['メールアドレス', 'ユーザー名'] }),
      ),
      value: TypeValueSchema,
    }),
  }),
  v.metadata({ description: 'テキストで要素を指定して入力' }),
  v.transform(
    (input): TypeWithInteractableText => ({
      command: 'type',
      interactableText: input.type.interactableText,
      value: input.type.value,
    }),
  ),
);

/**
 * type: { xpath: "...", value: "..." }
 */
const TypeXpathSchema = v.pipe(
  v.object({
    type: v.object({
      xpath: v.pipe(
        XpathSelectorSchema,
        v.description('XPath形式で要素を指定'),
        v.metadata({ exampleValues: ["//input[@name='email']"] }),
      ),
      value: TypeValueSchema,
    }),
  }),
  v.metadata({ description: 'XPathで要素を指定して入力' }),
  v.transform(
    (input): TypeWithXpath => ({
      command: 'type',
      xpath: input.type.xpath,
      value: input.type.value,
    }),
  ),
);

/**
 * TypeコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 3種類のセレクタをunionで組み合わせる。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const TypeYamlSchema = v.pipe(
  v.union([TypeCssSchema, TypeInteractableTextSchema, TypeXpathSchema]),
  v.description('要素にテキストを入力する（既存テキストに追加）'),
  v.metadata({ category: '入力' }),
);

/**
 * TypeYamlSchemaの入力型
 */
export type TypeYamlInput = v.InferInput<typeof TypeYamlSchema>;

/**
 * TypeCommand型（Single Source of Truth）
 */
export type TypeCommand = v.InferOutput<typeof TypeYamlSchema>;

// ============================================================================
// FillCommand
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type + value。
 */
type FillWithCss = { command: 'fill'; css: CssSelector; value: string };
type FillWithInteractableText = {
  command: 'fill';
  interactableText: InteractableTextSelector;
  value: string;
};
type FillWithXpath = { command: 'fill'; xpath: XpathSelector; value: string };

/**
 * valueフィールドスキーマ（fill用）
 */
const FillValueSchema = v.pipe(
  v.string(),
  v.description('入力するテキスト（既存テキストをクリアして入力）'),
  v.metadata({ exampleValues: ['新しいユーザー名', 'new@example.com'] }),
);

/**
 * fill: { css: "...", value: "..." }
 */
const FillCssSchema = v.pipe(
  v.object({
    fill: v.object({
      css: v.pipe(
        CssSelectorSchema,
        v.description('CSSセレクタ形式で要素を指定'),
        v.metadata({ exampleValues: ['#email', '.password-input'] }),
      ),
      value: FillValueSchema,
    }),
  }),
  v.metadata({ description: 'CSSセレクタで要素を指定して入力' }),
  v.transform(
    (input): FillWithCss => ({
      command: 'fill',
      css: input.fill.css,
      value: input.fill.value,
    }),
  ),
);

/**
 * fill: { interactableText: "...", value: "..." }
 */
const FillInteractableTextSchema = v.pipe(
  v.object({
    fill: v.object({
      interactableText: v.pipe(
        InteractableTextBrandedSchema,
        v.description('インタラクティブ要素をテキスト内容で検索'),
        v.metadata({ exampleValues: ['メールアドレス', 'パスワード'] }),
      ),
      value: FillValueSchema,
    }),
  }),
  v.metadata({ description: 'テキストで要素を指定して入力' }),
  v.transform(
    (input): FillWithInteractableText => ({
      command: 'fill',
      interactableText: input.fill.interactableText,
      value: input.fill.value,
    }),
  ),
);

/**
 * fill: { xpath: "...", value: "..." }
 */
const FillXpathSchema = v.pipe(
  v.object({
    fill: v.object({
      xpath: v.pipe(
        XpathSelectorSchema,
        v.description('XPath形式で要素を指定'),
        v.metadata({ exampleValues: ["//input[@type='password']"] }),
      ),
      value: FillValueSchema,
    }),
  }),
  v.metadata({ description: 'XPathで要素を指定して入力' }),
  v.transform(
    (input): FillWithXpath => ({
      command: 'fill',
      xpath: input.fill.xpath,
      value: input.fill.value,
    }),
  ),
);

/**
 * FillコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 3種類のセレクタをunionで組み合わせる。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const FillYamlSchema = v.pipe(
  v.union([FillCssSchema, FillInteractableTextSchema, FillXpathSchema]),
  v.description('要素にテキストを入力する（既存テキストをクリアして入力）'),
  v.metadata({ category: '入力' }),
);

/**
 * FillYamlSchemaの入力型
 */
export type FillYamlInput = v.InferInput<typeof FillYamlSchema>;

/**
 * FillCommand型（Single Source of Truth）
 */
export type FillCommand = v.InferOutput<typeof FillYamlSchema>;

// ============================================================================
// SelectCommand
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type + value。
 */
type SelectWithCss = { command: 'select'; css: CssSelector; value: string };
type SelectWithInteractableText = {
  command: 'select';
  interactableText: InteractableTextSelector;
  value: string;
};
type SelectWithXpath = { command: 'select'; xpath: XpathSelector; value: string };

/**
 * valueフィールドスキーマ（select用）
 */
const SelectValueSchema = v.pipe(
  v.string(),
  v.description('選択するオプションの値'),
  v.metadata({ exampleValues: ['japan', 'option1'] }),
);

/**
 * select: { css: "...", value: "..." }
 */
const SelectCssSchema = v.pipe(
  v.object({
    select: v.object({
      css: v.pipe(
        CssSelectorSchema,
        v.description('CSSセレクタ形式で要素を指定'),
        v.metadata({ exampleValues: ['#country', '.language-select'] }),
      ),
      value: SelectValueSchema,
    }),
  }),
  v.metadata({ description: 'CSSセレクタで要素を指定して選択' }),
  v.transform(
    (input): SelectWithCss => ({
      command: 'select',
      css: input.select.css,
      value: input.select.value,
    }),
  ),
);

/**
 * select: { interactableText: "...", value: "..." }
 */
const SelectInteractableTextSchema = v.pipe(
  v.object({
    select: v.object({
      interactableText: v.pipe(
        InteractableTextBrandedSchema,
        v.description('インタラクティブ要素をテキスト内容で検索'),
        v.metadata({ exampleValues: ['国を選択', '言語'] }),
      ),
      value: SelectValueSchema,
    }),
  }),
  v.metadata({ description: 'テキストで要素を指定して選択' }),
  v.transform(
    (input): SelectWithInteractableText => ({
      command: 'select',
      interactableText: input.select.interactableText,
      value: input.select.value,
    }),
  ),
);

/**
 * select: { xpath: "...", value: "..." }
 */
const SelectXpathSchema = v.pipe(
  v.object({
    select: v.object({
      xpath: v.pipe(
        XpathSelectorSchema,
        v.description('XPath形式で要素を指定'),
        v.metadata({ exampleValues: ["//select[@name='country']"] }),
      ),
      value: SelectValueSchema,
    }),
  }),
  v.metadata({ description: 'XPathで要素を指定して選択' }),
  v.transform(
    (input): SelectWithXpath => ({
      command: 'select',
      xpath: input.select.xpath,
      value: input.select.value,
    }),
  ),
);

/**
 * SelectコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 3種類のセレクタをunionで組み合わせる。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const SelectYamlSchema = v.pipe(
  v.union([SelectCssSchema, SelectInteractableTextSchema, SelectXpathSchema]),
  v.description('セレクトボックスからオプションを選択する'),
  v.metadata({ category: '入力' }),
);

/**
 * SelectYamlSchemaの入力型
 */
export type SelectYamlInput = v.InferInput<typeof SelectYamlSchema>;

/**
 * SelectCommand型（Single Source of Truth）
 */
export type SelectCommand = v.InferOutput<typeof SelectYamlSchema>;
