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
 * 各セレクタはBranded Typeスキーマを使用し、format検証も行う。
 * これにより1段階で形式検証 + Branded Type化が完了する。
 *
 * 注意: refセレクタはsnapshotコマンドで取得した要素参照を使用するためのもので、
 * E2Eテストでは再現性がないため削除された。
 */

import * as v from 'valibot';
import {
  AnyTextSelectorSchema as AnyTextBrandedSchema,
  CssSelectorSchema as CssBrandedSchema,
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
  XpathSelectorSchema as XpathBrandedSchema,
} from '@packages/agent-browser-adapter';

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
    v.description('CSSセレクタ形式で要素を指定'),
    v.metadata({ exampleValues: ['#login-button', '.submit-btn'] }),
  ),
});

/**
 * InteractableTextセレクタスキーマ
 *
 * インタラクティブ要素（ボタン、リンク、入力欄等）をテキスト内容で検索する。
 * click, fill, type, hover, select, assertEnabled, assertChecked で使用。
 * 例: { interactableText: "ログイン" }
 *
 * 出力はBranded Type (InteractableTextSelector)
 */
const InteractableTextSelectorSchema = v.object({
  interactableText: v.pipe(
    InteractableTextBrandedSchema,
    v.description('インタラクティブ要素をテキスト内容で検索'),
    v.metadata({ exampleValues: ['ログイン', '送信する'] }),
  ),
});

/**
 * AnyTextセレクタスキーマ
 *
 * 全ての要素（静的テキスト含む）をテキスト内容で検索する。
 * assertVisible, assertNotVisible, scrollIntoView, wait で使用。
 * 例: { anyText: "Welcome" }
 *
 * 出力はBranded Type (AnyTextSelector)
 */
const AnyTextSelectorSchema = v.object({
  anyText: v.pipe(
    AnyTextBrandedSchema,
    v.description('全要素をテキスト内容で検索'),
    v.metadata({ exampleValues: ['Welcome', 'エラーメッセージ'] }),
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
    v.description('XPath形式で要素を指定'),
    v.metadata({ exampleValues: ["//button[@type='submit']"] }),
  ),
});

/**
 * インタラクティブ要素用セレクタ指定スキーマ
 *
 * css, interactableText, xpath のいずれか1つのみを指定する。
 * click, fill, type, hover, select, assertEnabled, assertChecked で使用。
 */
export const InteractableSelectorSpecSchema = v.union([
  CssSelectorSchema,
  InteractableTextSelectorSchema,
  XpathSelectorSchema,
]);

/**
 * 全要素用セレクタ指定スキーマ
 *
 * css, anyText, xpath のいずれか1つのみを指定する。
 * assertVisible, assertNotVisible, scrollIntoView, wait で使用。
 */
export const AnySelectorSpecSchema = v.union([
  CssSelectorSchema,
  AnyTextSelectorSchema,
  XpathSelectorSchema,
]);

/**
 * セレクタ指定スキーマ（後方互換用）
 *
 * @deprecated 将来的にInteractableSelectorSpecSchemaまたはAnySelectorSpecSchemaを直接使用すること
 */
export const SelectorSpecSchema = v.union([InteractableSelectorSpecSchema, AnySelectorSpecSchema]);

/**
 * InteractableSelectorSpecSchemaの入力型
 */
export type InteractableSelectorSpecInput = v.InferInput<typeof InteractableSelectorSpecSchema>;

/**
 * InteractableSelectorSpecSchemaの出力型
 */
export type InteractableSelectorSpecOutput = v.InferOutput<typeof InteractableSelectorSpecSchema>;

/**
 * AnySelectorSpecSchemaの入力型
 */
export type AnySelectorSpecInput = v.InferInput<typeof AnySelectorSpecSchema>;

/**
 * AnySelectorSpecSchemaの出力型
 */
export type AnySelectorSpecOutput = v.InferOutput<typeof AnySelectorSpecSchema>;

/**
 * SelectorSpecSchemaの入力型（後方互換用）
 * @deprecated
 */
export type SelectorSpecInput = v.InferInput<typeof SelectorSpecSchema>;

/**
 * SelectorSpecSchemaの出力型（後方互換用）
 * @deprecated
 */
export type SelectorSpecOutput = v.InferOutput<typeof SelectorSpecSchema>;
