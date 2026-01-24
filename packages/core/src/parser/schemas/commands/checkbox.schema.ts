/**
 * チェックボックスコマンドスキーマ定義
 *
 * YAML入力形式のcheck/uncheckコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 簡略形式: check: "ラベルテキスト" → { command: 'check', interactableText: InteractableTextSelector }
 * - 詳細形式: check: { css: "..." } → { command: 'check', css: CssSelector }
 * - 簡略形式: uncheck: "ラベルテキスト" → { command: 'uncheck', interactableText: InteractableTextSelector }
 * - 詳細形式: uncheck: { css: "..." } → { command: 'uncheck', css: CssSelector }
 *
 * Single Source of Truth:
 * - CheckYamlSchema, UncheckYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - CheckCommand, UncheckCommand: スキーマから導出されるBranded Type
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

// ============================================================================
// CheckCommand
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * CheckCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type CheckWithInteractableText = { command: 'check'; interactableText: InteractableTextSelector };
type CheckWithCss = { command: 'check'; css: CssSelector };
type CheckWithXpath = { command: 'check'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ（check用）
 *
 * check: "ラベルテキスト" → { command: 'check', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const CheckShorthandSchema = v.pipe(
  v.object({
    check: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['利用規約に同意する', 'メール配信を希望する'] }),
    ),
  }),
  v.metadata({
    description: 'Check checkbox specified by text',
  }),
  v.transform(
    (input): CheckWithInteractableText => ({
      command: 'check',
      interactableText: input.check,
    }),
  ),
);

/**
 * 詳細形式スキーマ（check用）
 *
 * check: { css: "..." } → { command: 'check', css: CssSelector }
 * check: { interactableText: "..." } → { command: 'check', interactableText: InteractableTextSelector }
 * check: { xpath: "..." } → { command: 'check', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const CheckDetailedSchema = v.pipe(
  v.object({
    check: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'Check checkbox specified by selector',
  }),
  v.transform((input): CheckWithCss | CheckWithInteractableText | CheckWithXpath => {
    const selector: InteractableSelectorSpecOutput = input.check;
    const result: CheckWithCss | CheckWithInteractableText | CheckWithXpath = {
      command: 'check',
      ...selector,
    };
    return result;
  }),
);

/**
 * CheckコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はCheckCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const CheckYamlSchema = v.pipe(
  v.union([CheckShorthandSchema, CheckDetailedSchema]),
  v.description('チェックボックスをチェックする'),
  v.metadata({ category: 'Interaction' }),
);

/**
 * CheckYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type CheckYamlInput = v.InferInput<typeof CheckYamlSchema>;

/**
 * CheckCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type CheckCommand = v.InferOutput<typeof CheckYamlSchema>;

// ============================================================================
// UncheckCommand
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type。
 */
type UncheckWithInteractableText = {
  command: 'uncheck';
  interactableText: InteractableTextSelector;
};
type UncheckWithCss = { command: 'uncheck'; css: CssSelector };
type UncheckWithXpath = { command: 'uncheck'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ（uncheck用）
 *
 * uncheck: "ラベルテキスト" → { command: 'uncheck', interactableText: InteractableTextSelector }
 * 文字列を直接指定した場合、インタラクティブ要素のテキスト検索として解釈する。
 * InteractableTextSelectorとしてBranded Type化される。
 */
const UncheckShorthandSchema = v.pipe(
  v.object({
    uncheck: v.pipe(
      InteractableTextBrandedSchema,
      v.metadata({ exampleValues: ['利用規約に同意する', 'メール配信を希望する'] }),
    ),
  }),
  v.metadata({
    description: 'Uncheck checkbox specified by text',
  }),
  v.transform(
    (input): UncheckWithInteractableText => ({
      command: 'uncheck',
      interactableText: input.uncheck,
    }),
  ),
);

/**
 * 詳細形式スキーマ（uncheck用）
 *
 * uncheck: { css: "..." } → { command: 'uncheck', css: CssSelector }
 * uncheck: { interactableText: "..." } → { command: 'uncheck', interactableText: InteractableTextSelector }
 * uncheck: { xpath: "..." } → { command: 'uncheck', xpath: XpathSelector }
 *
 * InteractableSelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const UncheckDetailedSchema = v.pipe(
  v.object({
    uncheck: InteractableSelectorSpecSchema,
  }),
  v.metadata({
    description: 'Uncheck checkbox specified by selector',
  }),
  v.transform((input): UncheckWithCss | UncheckWithInteractableText | UncheckWithXpath => {
    const selector: InteractableSelectorSpecOutput = input.uncheck;
    const result: UncheckWithCss | UncheckWithInteractableText | UncheckWithXpath = {
      command: 'uncheck',
      ...selector,
    };
    return result;
  }),
);

/**
 * UncheckコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はUncheckCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const UncheckYamlSchema = v.pipe(
  v.union([UncheckShorthandSchema, UncheckDetailedSchema]),
  v.description('チェックボックスのチェックを外す'),
  v.metadata({ category: 'Interaction' }),
);

/**
 * UncheckYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type UncheckYamlInput = v.InferInput<typeof UncheckYamlSchema>;

/**
 * UncheckCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type UncheckCommand = v.InferOutput<typeof UncheckYamlSchema>;
