/**
 * ScrollIntoViewコマンドスキーマ定義
 *
 * YAML入力形式のscrollIntoViewコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - 簡略形式: scrollIntoView: "テキスト" → { command: 'scrollIntoView', text: TextSelector }
 * - 詳細形式: scrollIntoView: { css: "..." } → { command: 'scrollIntoView', css: CssSelector }
 *
 * Single Source of Truth:
 * - ScrollIntoViewYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - ScrollIntoViewCommand: スキーマから導出されるBranded Type
 */

import {
  AnyTextSelectorSchema as AnyTextBrandedSchema,
  type AnyTextSelector,
  type CssSelector,
  type XpathSelector,
} from '@packages/agent-browser-adapter';
import * as v from 'valibot';
import { type AnySelectorSpecOutput, AnySelectorSpecSchema } from '../selector.schema';

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * ScrollIntoViewCommandは大きなunion型なので、各transformが
 * 出力する具体的な型を明示することで型安全性を向上させる。
 *
 * 全てBranded Type。
 */
type ScrollIntoViewWithAnyText = { command: 'scrollIntoView'; anyText: AnyTextSelector };
type ScrollIntoViewWithCss = { command: 'scrollIntoView'; css: CssSelector };
type ScrollIntoViewWithXpath = { command: 'scrollIntoView'; xpath: XpathSelector };

/**
 * 簡略形式スキーマ
 *
 * scrollIntoView: "テキスト" → { command: 'scrollIntoView', anyText: AnyTextSelector }
 * 文字列を直接指定した場合、全要素をテキスト検索として解釈する。
 * AnyTextSelectorとしてBranded Type化される。
 */
const ScrollIntoViewShorthandSchema = v.pipe(
  v.object({
    scrollIntoView: v.pipe(
      AnyTextBrandedSchema,
      v.metadata({ exampleValues: ['Submit button', 'Footer'] }),
    ),
  }),
  v.metadata({
    description: 'Scroll to element specified by text',
  }),
  v.transform(
    (input): ScrollIntoViewWithAnyText => ({
      command: 'scrollIntoView',
      anyText: input.scrollIntoView,
    }),
  ),
);

/**
 * 詳細形式スキーマ
 *
 * scrollIntoView: { css: "..." } → { command: 'scrollIntoView', css: CssSelector }
 * scrollIntoView: { anyText: "..." } → { command: 'scrollIntoView', anyText: AnyTextSelector }
 * scrollIntoView: { xpath: "..." } → { command: 'scrollIntoView', xpath: XpathSelector }
 *
 * AnySelectorSpecSchemaを使用。format検証 + Branded Type化が1段階で完了。
 */
const ScrollIntoViewDetailedSchema = v.pipe(
  v.object({
    scrollIntoView: AnySelectorSpecSchema,
  }),
  v.metadata({
    description: 'Scroll to element specified by selector',
  }),
  v.transform(
    (input): ScrollIntoViewWithCss | ScrollIntoViewWithAnyText | ScrollIntoViewWithXpath => {
      const selector: AnySelectorSpecOutput = input.scrollIntoView;
      const result: ScrollIntoViewWithCss | ScrollIntoViewWithAnyText | ScrollIntoViewWithXpath = {
        command: 'scrollIntoView',
        ...selector,
      };
      return result;
    },
  ),
);

/**
 * ScrollIntoViewコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * 出力型はScrollIntoViewCommand（Branded Type）。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const ScrollIntoViewYamlSchema = v.pipe(
  v.union([ScrollIntoViewShorthandSchema, ScrollIntoViewDetailedSchema]),
  v.description('要素が表示されるまでスクロール'),
  v.metadata({ category: 'Navigation' }),
);

/**
 * ScrollIntoViewYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type ScrollIntoViewYamlInput = v.InferInput<typeof ScrollIntoViewYamlSchema>;

/**
 * ScrollIntoViewCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出されるBranded Type。
 * 形式検証 + format検証 + Branded Type化が1段階で完了。
 */
export type ScrollIntoViewCommand = v.InferOutput<typeof ScrollIntoViewYamlSchema>;
