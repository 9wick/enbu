/**
 * 待機コマンドスキーマ定義
 *
 * YAML入力形式のwaitコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - wait: 1000 → { command: 'wait', ms: number }
 * - wait: { css: '#id' } → { command: 'wait', css: CssSelector }
 * - wait: { ref: 'name' } → { command: 'wait', ref: RefSelector }
 * - wait: { text: 'テキスト' } → { command: 'wait', text: TextSelector }
 * - wait: { xpath: '//div' } → { command: 'wait', xpath: XpathSelector }
 * - wait: { load: 'networkidle' } → { command: 'wait', load: LoadState }
 * - wait: { url: 'https://' } → { command: 'wait', url: string }
 * - wait: { fn: 'code' } → { command: 'wait', fn: string }
 *
 * Single Source of Truth:
 * - WaitYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 */

import * as v from 'valibot';
import {
  type AnyTextSelector,
  type CssSelector,
  type XpathSelector,
  type JsExpression,
  CssSelectorSchema as CssBrandedSchema,
  AnyTextSelectorSchema as AnyTextBrandedSchema,
  XpathSelectorSchema as XpathBrandedSchema,
  JsExpressionSchema,
} from '@packages/agent-browser-adapter';

// ============================================================================
// LoadState
// ============================================================================

/**
 * ページ読み込み状態
 *
 * - load: ページの読み込み完了
 * - domcontentloaded: DOMの解析完了
 * - networkidle: ネットワークアイドル状態
 */
const LoadStateSchema = v.pipe(
  v.picklist(['load', 'domcontentloaded', 'networkidle']),
  v.description('ページの読み込み状態'),
);

type LoadState = v.InferOutput<typeof LoadStateSchema>;

// ============================================================================
// Wait Variants (each with its own transform)
// ============================================================================

/**
 * ms待機: wait: 1000
 *
 * 指定ミリ秒待機する。
 */
type WaitMs = { command: 'wait'; ms: number };
const WaitMsSchema = v.pipe(
  v.object({
    wait: v.pipe(
      v.number(),
      v.description('待機時間（ミリ秒）'),
      v.metadata({ exampleValues: [1000, 3000] }),
    ),
  }),
  v.metadata({
    description: '指定ミリ秒待機',
  }),
  v.transform(
    (input): WaitMs => ({
      command: 'wait',
      ms: input.wait,
    }),
  ),
);

/**
 * css待機: wait: { css: '#id' }
 *
 * CSSセレクタで要素が表示されるまで待機する。
 * 出力はBranded Type (CssSelector)
 */
type WaitCss = { command: 'wait'; css: CssSelector };
const WaitCssSchema = v.pipe(
  v.object({
    wait: v.object({
      css: v.pipe(
        CssBrandedSchema,
        v.description('CSSセレクタ形式で要素を指定'),
        v.metadata({ exampleValues: ['#login-button', '.submit-btn'] }),
      ),
    }),
  }),
  v.metadata({
    description: 'CSSセレクタで指定した要素が表示されるまで待機',
  }),
  v.transform(
    (input): WaitCss => ({
      command: 'wait',
      css: input.wait.css,
    }),
  ),
);

/**
 * anyText待機: wait: { anyText: 'テキスト' }
 *
 * 全要素をテキスト内容で検索して表示されるまで待機する。
 * 出力はBranded Type (AnyTextSelector)
 */
type WaitAnyText = { command: 'wait'; anyText: AnyTextSelector };
const WaitAnyTextSchema = v.pipe(
  v.object({
    wait: v.object({
      anyText: v.pipe(
        AnyTextBrandedSchema,
        v.description('全要素をテキスト内容で検索'),
        v.metadata({ exampleValues: ['ログイン', '送信する'] }),
      ),
    }),
  }),
  v.metadata({
    description: 'テキストで指定した要素が表示されるまで待機',
  }),
  v.transform(
    (input): WaitAnyText => ({
      command: 'wait',
      anyText: input.wait.anyText,
    }),
  ),
);

/**
 * xpath待機: wait: { xpath: '//div' }
 *
 * XPath形式で要素が表示されるまで待機する。
 * 出力はBranded Type (XpathSelector)
 */
type WaitXpath = { command: 'wait'; xpath: XpathSelector };
const WaitXpathSchema = v.pipe(
  v.object({
    wait: v.object({
      xpath: v.pipe(
        XpathBrandedSchema,
        v.description('XPath形式で要素を指定'),
        v.metadata({ exampleValues: ["//button[@type='submit']"] }),
      ),
    }),
  }),
  v.metadata({
    description: 'XPathで指定した要素が表示されるまで待機',
  }),
  v.transform(
    (input): WaitXpath => ({
      command: 'wait',
      xpath: input.wait.xpath,
    }),
  ),
);

/**
 * load待機: wait: { load: 'networkidle' }
 *
 * ページの読み込み状態が指定の状態になるまで待機する。
 */
type WaitLoad = { command: 'wait'; load: LoadState };
const WaitLoadSchema = v.pipe(
  v.object({
    wait: v.object({
      load: v.pipe(
        LoadStateSchema,
        v.metadata({ exampleValues: ['networkidle', 'domcontentloaded'] }),
      ),
    }),
  }),
  v.metadata({
    description: 'ページの読み込み状態が指定の状態になるまで待機',
  }),
  v.transform(
    (input): WaitLoad => ({
      command: 'wait',
      load: input.wait.load,
    }),
  ),
);

/**
 * url待機: wait: { url: 'https://' }
 *
 * URLが指定の文字列を含むまで待機する（部分一致）。
 */
type WaitUrl = { command: 'wait'; url: string };
const WaitUrlSchema = v.pipe(
  v.object({
    wait: v.object({
      url: v.pipe(
        v.string(),
        v.description('待機するURL（部分一致）'),
        v.metadata({ exampleValues: ['https://example.com', '/dashboard'] }),
      ),
    }),
  }),
  v.metadata({
    description: 'URLが指定の文字列を含むまで待機',
  }),
  v.transform(
    (input): WaitUrl => ({
      command: 'wait',
      url: input.wait.url,
    }),
  ),
);

/**
 * fn待機: wait: { fn: 'code' }
 *
 * 関数が真を返すまで待機する。
 * Branded TypeのJsExpressionとして型安全に変換。
 */
type WaitFn = { command: 'wait'; fn: JsExpression };
const WaitFnSchema = v.pipe(
  v.object({
    wait: v.object({
      fn: v.pipe(
        JsExpressionSchema,
        v.description('待機条件の関数'),
        v.metadata({ exampleValues: ['() => document.readyState === "complete"'] }),
      ),
    }),
  }),
  v.metadata({
    description: '関数が真を返すまで待機',
  }),
  v.transform(
    (input): WaitFn => ({
      command: 'wait',
      fn: input.wait.fn,
    }),
  ),
);

// ============================================================================
// WaitYamlSchema (union of all variants)
// ============================================================================

/**
 * WaitコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 複数の待機バリアントをunionで表現。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const WaitYamlSchema = v.pipe(
  v.union([
    WaitMsSchema,
    WaitCssSchema,
    WaitAnyTextSchema,
    WaitXpathSchema,
    WaitLoadSchema,
    WaitUrlSchema,
    WaitFnSchema,
  ]),
  v.description('指定の条件まで待機する'),
  v.metadata({ category: '待機' }),
);

/**
 * WaitYamlSchemaの入力型
 *
 * YAML形式の入力を表す。
 */
export type WaitYamlInput = v.InferInput<typeof WaitYamlSchema>;

/**
 * WaitCommand型（Single Source of Truth）
 *
 * valibotスキーマから導出される型。
 * セレクタ部分はBranded Type。
 */
export type WaitCommand = v.InferOutput<typeof WaitYamlSchema>;
