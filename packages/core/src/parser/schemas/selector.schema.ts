/**
 * セレクタスキーマ定義
 *
 * YAML入力形式のセレクタをvalibotで検証する。
 * css, text, xpath の3種類のセレクタを排他的unionで定義。
 *
 * Single Source of Truth:
 * - Runtime版スキーマのみを定義（brand/metadata込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 入出力変換:
 * - YAML入力では `text` キーを使用
 * - InteractableSelectorSpecSchema: text → interactableText に変換
 * - AnySelectorSpecSchema: text → anyText に変換
 *
 * 各セレクタはBranded Typeスキーマを使用し、format検証も行う。
 * これにより1段階で形式検証 + Branded Type化が完了する。
 *
 * 注意: refセレクタはsnapshotコマンドで取得した要素参照を使用するためのもので、
 * E2Eテストでは再現性がないため削除された。
 */

import {
  AnyTextSelectorSchema as AnyTextBrandedSchema,
  CssSelectorSchema as CssBrandedSchema,
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
  XpathSelectorSchema as XpathBrandedSchema,
  type AnyTextSelector,
  type CssSelector,
  type InteractableTextSelector,
  type XpathSelector,
} from '@packages/agent-browser-adapter';
import { match, P } from 'ts-pattern';
import * as v from 'valibot';

/**
 * CSSセレクタスキーマ
 *
 * CSS形式で要素を指定する。
 * 例: { css: "#login-button" }
 *
 * 出力はBranded Type (CssSelector)
 */
const CssSelectorSchema = v.object({
  css: v.pipe(
    CssBrandedSchema,
    v.description('Specify element by CSS selector'),
    v.metadata({ exampleValues: ['#login-button', '.submit-btn'] }),
  ),
});

/**
 * テキストセレクタ入力スキーマ（YAML入力用）
 *
 * ユーザーは text キーで指定し、内部で用途に応じて
 * interactableText または anyText に変換される。
 */
const TextInputSchema = v.object({
  text: v.pipe(
    v.string(),
    v.minLength(1, 'textセレクタは空文字列にできません'),
    v.description('テキスト内容で要素を検索'),
    v.metadata({ exampleValues: ['ログイン', '送信'] }),
  ),
});

/**
 * XPathセレクタスキーマ
 *
 * XPath形式で要素を指定する。
 * 例: { xpath: "//button[@type='submit']" }
 *
 * 出力はBranded Type (XpathSelector)
 */
const XpathSelectorSchema = v.object({
  xpath: v.pipe(
    XpathBrandedSchema,
    v.description('Specify element by XPath'),
    v.metadata({ exampleValues: ["//button[@type='submit']"] }),
  ),
});

/**
 * インタラクティブ要素用セレクタ指定スキーマ
 *
 * 入力: css, text, xpath のいずれか1つのみを指定する。
 * text入力の場合、transformで `{ interactableText: ... }` に変換される。
 * click, fill, type, hover, select, assertEnabled, assertChecked で使用。
 */
export const InteractableSelectorSpecSchema = v.pipe(
  v.union([CssSelectorSchema, TextInputSchema, XpathSelectorSchema]),
  v.transform(
    (
      input,
    ):
      | { css: CssSelector }
      | { interactableText: InteractableTextSelector }
      | { xpath: XpathSelector } =>
      match(input)
        .with({ text: P.string }, ({ text }) => {
          // Branded Typeを適用（InteractableTextBrandedSchemaを通す）
          const parsed = v.parse(InteractableTextBrandedSchema, text);
          return { interactableText: parsed };
        })
        .with({ css: P._ }, (cssInput) => cssInput)
        .with({ xpath: P._ }, (xpathInput) => xpathInput)
        .exhaustive(),
  ),
);

/**
 * 全要素用セレクタ指定スキーマ
 *
 * 入力: css, text, xpath のいずれか1つのみを指定する。
 * text入力の場合、transformで `{ anyText: ... }` に変換される。
 * assertVisible, assertNotVisible, scrollIntoView, wait で使用。
 */
export const AnySelectorSpecSchema = v.pipe(
  v.union([CssSelectorSchema, TextInputSchema, XpathSelectorSchema]),
  v.transform(
    (input): { css: CssSelector } | { anyText: AnyTextSelector } | { xpath: XpathSelector } =>
      match(input)
        .with({ text: P.string }, ({ text }) => {
          // Branded Typeを適用（AnyTextBrandedSchemaを通す）
          const parsed = v.parse(AnyTextBrandedSchema, text);
          return { anyText: parsed };
        })
        .with({ css: P._ }, (cssInput) => cssInput)
        .with({ xpath: P._ }, (xpathInput) => xpathInput)
        .exhaustive(),
  ),
);

/**
 * InteractableSelectorSpecSchemaの入力型
 *
 * YAML入力形式: css | text | xpath
 */
export type InteractableSelectorSpecInput = v.InferInput<typeof InteractableSelectorSpecSchema>;

/**
 * InteractableSelectorSpecSchemaの出力型
 *
 * transform後の形式: css | interactableText | xpath
 * （text は含まない）
 */
export type InteractableSelectorSpecOutput = v.InferOutput<typeof InteractableSelectorSpecSchema>;

/**
 * AnySelectorSpecSchemaの入力型
 *
 * YAML入力形式: css | text | xpath
 */
export type AnySelectorSpecInput = v.InferInput<typeof AnySelectorSpecSchema>;

/**
 * AnySelectorSpecSchemaの出力型
 *
 * transform後の形式: css | anyText | xpath
 * （text は含まない）
 */
export type AnySelectorSpecOutput = v.InferOutput<typeof AnySelectorSpecSchema>;
