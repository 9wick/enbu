/**
 * agent-browser-adapter の型定義
 *
 * このファイルで定義される型は全て外部に公開される。
 * 内部でのみ使う型は各ファイル内で定義すること。
 */

import type * as v from 'valibot';
import * as valibot from 'valibot';
import { ok, err, type Result } from 'neverthrow';

// ==========================================
// セレクタ型定義（DDD準拠：異なるドメイン概念を明確に分離）
// ==========================================

/**
 * CSSセレクタ
 *
 * Playwrightに直接渡せるCSSセレクタ形式
 * 例: "#login-button", ".submit", "div", "[data-testid='x']", "button.primary", ":nth-child(1)"
 * 空文字列は許可されない
 *
 * 基本的な形式チェック:
 * - タグ名（英字で始まる）: div, button, input
 * - ID: #xxx
 * - クラス: .xxx
 * - 属性: [xxx]
 * - 疑似セレクタ: :xxx
 * - ユニバーサル: *
 */
export const CssSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'CSSセレクタは空文字列にできません'),
  valibot.regex(
    /^[a-zA-Z#.[:*]/,
    'CSSセレクタはタグ名、#、.、[、:、* のいずれかで始まる必要があります',
  ),
  valibot.brand('CssSelector'),
);
export type CssSelector = valibot.InferOutput<typeof CssSelectorSchema>;

/**
 * Ref形式セレクタ
 *
 * agent-browser snapshot由来の要素参照
 * 形式: @ + 英数字 (例: @e1, @e2, @login)
 */
export const RefSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^@[a-zA-Z0-9]+$/, 'RefSelectorは@で始まり英数字が続く形式です'),
  valibot.brand('RefSelector'),
);
export type RefSelector = valibot.InferOutput<typeof RefSelectorSchema>;

/**
 * 全要素テキストセレクタ（AnyText）
 *
 * 全ての要素（静的テキスト含む）をテキスト内容で検索するためのセレクタ
 * assertVisible, assertNotVisible, scrollIntoView, wait で使用
 * text=形式で直接処理される
 * 空文字列は許可されない
 */
export const AnyTextSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'AnyTextSelectorは空文字列にできません'),
  valibot.brand('AnyTextSelector'),
);
export type AnyTextSelector = valibot.InferOutput<typeof AnyTextSelectorSchema>;

/**
 * インタラクティブ要素テキストセレクタ（InteractableText）
 *
 * インタラクティブ要素（ボタン、リンク、入力欄等）をテキスト内容で検索するためのセレクタ
 * click, fill, type, hover, select, assertEnabled, assertChecked で使用
 * 実行時にsnapshot→テキストマッチ→RefSelectorに変換される
 * 空文字列は許可されない
 */
export const InteractableTextSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'InteractableTextSelectorは空文字列にできません'),
  valibot.brand('InteractableTextSelector'),
);
export type InteractableTextSelector = valibot.InferOutput<typeof InteractableTextSelectorSchema>;

/**
 * XPathセレクタ
 *
 * XPath形式で要素を指定するセレクタ
 * 例: "//button[@type='submit']", "/html/body/div"
 * agent-browserへは xpath=//xxx 形式で渡される
 *
 * 基本的な形式チェック:
 * - 絶対パス: /xxx
 * - 相対パス: //xxx
 */
export const XpathSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'XPathセレクタは空文字列にできません'),
  valibot.regex(/^\//, 'XPathセレクタは / で始まる必要があります'),
  valibot.brand('XpathSelector'),
);
export type XpathSelector = valibot.InferOutput<typeof XpathSelectorSchema>;

// ==========================================
// CLI形式セレクタ型（agent-browser CLIに渡す形式）
//
// 内部セレクタ型との違い:
// - TextSelector: "ログイン" → CliTextSelector: "text=ログイン"
// - XpathSelector: "//button" → CliXpathSelector: "xpath=//button"
// - CssSelector, RefSelectorはCLI形式でもそのまま使用可能
// ==========================================

/**
 * CLI形式テキストセレクタ
 *
 * agent-browser CLIに渡すテキスト検索形式
 * 形式: "text=xxx"（例: "text=ログイン"）
 */
export const CliTextSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^text=.+$/, 'CliTextSelectorは "text=" で始まる必要があります'),
  valibot.brand('CliTextSelector'),
);
export type CliTextSelector = valibot.InferOutput<typeof CliTextSelectorSchema>;

/**
 * CLI形式XPathセレクタ
 *
 * agent-browser CLIに渡すXPath検索形式
 * 形式: "xpath=xxx"（例: "xpath=//button[@type='submit']"）
 */
export const CliXpathSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^xpath=\/.+$/, 'CliXpathSelectorは "xpath=/" で始まる必要があります'),
  valibot.brand('CliXpathSelector'),
);
export type CliXpathSelector = valibot.InferOutput<typeof CliXpathSelectorSchema>;

/**
 * CLIに渡せるセレクタ型
 *
 * agent-browser CLIは以下の形式をサポート:
 * - CssSelector: "#id", ".class" などのCSS形式（そのまま渡す）
 * - RefSelector: "@e1", "@e2" などのRef参照形式（そのまま渡す）
 * - CliTextSelector: "text=xxx" 形式でテキスト検索
 * - CliXpathSelector: "xpath=//xxx" 形式でXPath検索
 */
export type CliSelector = CssSelector | RefSelector | CliTextSelector | CliXpathSelector;

// ==========================================
// Brand型定義（valibotのbrand関数で実装）
// agent-browserと同様にmin(1)で空文字列を禁止
// ==========================================

/**
 * URL文字列
 *
 * 例: "https://example.com"
 * 空文字列は許可されない（agent-browserのz.string().min(1)に対応）
 */
export const UrlSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'URLは空文字列にできません'),
  valibot.brand('Url'),
);
export type Url = valibot.InferOutput<typeof UrlSchema>;

/**
 * ファイルパス文字列
 *
 * 例: "./screenshots/result.png"
 * 空文字列は許可されない（agent-browserのz.string().min(1)に対応）
 */
export const FilePathSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'ファイルパスは空文字列にできません'),
  valibot.brand('FilePath'),
);
export type FilePath = valibot.InferOutput<typeof FilePathSchema>;

/**
 * キーボードキー名
 *
 * 例: "Enter", "Tab", "Escape"
 * 空文字列は許可されない（agent-browserのz.string().min(1)に対応）
 */
export const KeyboardKeySchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'キーボードキーは空文字列にできません'),
  valibot.brand('KeyboardKey'),
);
export type KeyboardKey = valibot.InferOutput<typeof KeyboardKeySchema>;

/**
 * JavaScript式
 *
 * 例: "document.title", "window.scrollY > 100"
 * 空文字列は許可されない（agent-browserのz.string().min(1)に対応）
 */
export const JsExpressionSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'JavaScript式は空文字列にできません'),
  valibot.brand('JsExpression'),
);
export type JsExpression = valibot.InferOutput<typeof JsExpressionSchema>;

/**
 * スクロール方向
 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * ページロード状態
 */
export type LoadState = 'load' | 'domcontentloaded' | 'networkidle';

// ==========================================
// Brand型検証エラー
// ==========================================

/**
 * Brand型の検証に失敗した場合のエラー
 *
 * プレゼンテーション層でユーザー入力を検証する際に使用される
 */
export type BrandValidationError = {
  /** エラー種別 */
  type: 'brand_validation_error';
  /** エラーメッセージ（日本語） */
  message: string;
  /** 検証に失敗したフィールド名 */
  field:
    | 'cssSelector'
    | 'refSelector'
    | 'anyTextSelector'
    | 'interactableTextSelector'
    | 'xpathSelector'
    | 'cliTextSelector'
    | 'cliXpathSelector'
    | 'url'
    | 'filePath'
    | 'keyboardKey'
    | 'jsExpression';
  /** 検証に失敗した値 */
  value: string;
};

// ==========================================
// セレクタ型のファクトリ関数（Result型を返す）
// ==========================================

/**
 * CSSセレクタとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はCssSelector型、失敗時はBrandValidationError
 */
export const asCssSelector = (value: string): Result<CssSelector, BrandValidationError> => {
  const result = valibot.safeParse(CssSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'CSSセレクタは空文字列にできません',
    field: 'cssSelector',
    value,
  });
};

/**
 * RefSelectorとして検証・変換
 *
 * @で始まり英数字が続く形式でない場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はRefSelector型、失敗時はBrandValidationError
 */
export const asRefSelector = (value: string): Result<RefSelector, BrandValidationError> => {
  const result = valibot.safeParse(RefSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'RefSelectorは@で始まり英数字が続く形式です',
    field: 'refSelector',
    value,
  });
};

/**
 * AnyTextSelectorとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はAnyTextSelector型、失敗時はBrandValidationError
 */
export const asAnyTextSelector = (value: string): Result<AnyTextSelector, BrandValidationError> => {
  const result = valibot.safeParse(AnyTextSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'AnyTextSelectorは空文字列にできません',
    field: 'anyTextSelector',
    value,
  });
};

/**
 * InteractableTextSelectorとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はInteractableTextSelector型、失敗時はBrandValidationError
 */
export const asInteractableTextSelector = (
  value: string,
): Result<InteractableTextSelector, BrandValidationError> => {
  const result = valibot.safeParse(InteractableTextSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'InteractableTextSelectorは空文字列にできません',
    field: 'interactableTextSelector',
    value,
  });
};

/**
 * XpathSelectorとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はXpathSelector型、失敗時はBrandValidationError
 */
export const asXpathSelector = (value: string): Result<XpathSelector, BrandValidationError> => {
  const result = valibot.safeParse(XpathSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'XpathSelectorは空文字列にできません',
    field: 'xpathSelector',
    value,
  });
};

// ==========================================
// CLI形式セレクタ型のファクトリ関数（Result型を返す）
// ==========================================

/**
 * CliTextSelectorとして検証・変換
 *
 * "text=" で始まらない場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はCliTextSelector型、失敗時はBrandValidationError
 */
export const asCliTextSelector = (value: string): Result<CliTextSelector, BrandValidationError> => {
  const result = valibot.safeParse(CliTextSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'CliTextSelectorは "text=" で始まる必要があります',
    field: 'cliTextSelector',
    value,
  });
};

/**
 * CliXpathSelectorとして検証・変換
 *
 * "xpath=/" で始まらない場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はCliXpathSelector型、失敗時はBrandValidationError
 */
export const asCliXpathSelector = (
  value: string,
): Result<CliXpathSelector, BrandValidationError> => {
  const result = valibot.safeParse(CliXpathSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'CliXpathSelectorは "xpath=/" で始まる必要があります',
    field: 'cliXpathSelector',
    value,
  });
};

// ==========================================
// Brand型のファクトリ関数（Result型を返す）
// agent-browserのz.string().min(1)に対応した検証を実行
// ==========================================

/**
 * URLとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はUrl型、失敗時はBrandValidationError
 */
export const asUrl = (value: string): Result<Url, BrandValidationError> => {
  const result = valibot.safeParse(UrlSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'URLは空文字列にできません',
    field: 'url',
    value,
  });
};

/**
 * ファイルパスとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はFilePath型、失敗時はBrandValidationError
 */
export const asFilePath = (value: string): Result<FilePath, BrandValidationError> => {
  const result = valibot.safeParse(FilePathSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'ファイルパスは空文字列にできません',
    field: 'filePath',
    value,
  });
};

/**
 * キーボードキーとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はKeyboardKey型、失敗時はBrandValidationError
 */
export const asKeyboardKey = (value: string): Result<KeyboardKey, BrandValidationError> => {
  const result = valibot.safeParse(KeyboardKeySchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'キーボードキーは空文字列にできません',
    field: 'keyboardKey',
    value,
  });
};

/**
 * JavaScript式として検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はJsExpression型、失敗時はBrandValidationError
 */
export const asJsExpression = (value: string): Result<JsExpression, BrandValidationError> => {
  const result = valibot.safeParse(JsExpressionSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'JavaScript式は空文字列にできません',
    field: 'jsExpression',
    value,
  });
};

// ==========================================
// エラー型
// ==========================================

/**
 * agent-browserのエラー型
 *
 * 全てのagent-browser関連操作で発生しうるエラーを含む。
 * typeフィールドを見れば、どこで・何が起きたかが分かる。
 */
export type AgentBrowserError =
  | {
      /** agent-browserがインストールされていない、または起動できない */
      type: 'not_installed';
      message: string;
    }
  | {
      /** プロセスが非0終了コードで終了した（exitCode !== 0） */
      type: 'command_failed';
      message: string;
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      /** CLIのJSON出力から取得したエラーメッセージ（パース可能な場合） */
      rawError: string | null;
    }
  | {
      /** agent-browserがsuccess:falseを返した（exitCode === 0だが操作失敗） */
      type: 'command_execution_failed';
      message: string;
      command: string;
      /** CLIが返したerrorフィールドの値 */
      rawError: string;
    }
  | {
      /** コマンドがタイムアウトした */
      type: 'timeout';
      command: string;
      args: readonly string[];
      timeoutMs: number;
    }
  | {
      /** JSON出力のパースに失敗した */
      type: 'parse_error';
      message: string;
      rawOutput: string;
    }
  | {
      /** agent-browserの出力JSONがスキーマに合わない */
      type: 'agent_browser_output_parse_error';
      message: string;
      command: string;
      issues: readonly v.BaseIssue<unknown>[];
      rawOutput: string;
    }
  | BrandValidationError;

/**
 * agent-browserの--json出力の共通構造
 */
export type AgentBrowserJsonOutput<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

/**
 * executeCommand のオプション
 */
export type ExecuteOptions = {
  sessionName?: string;
  headed?: boolean;
  timeoutMs?: number;
  cwd?: string;
};

/**
 * browserScreenshot のオプション
 */
export type ScreenshotOptions = ExecuteOptions & {
  /** ページ全体のスクリーンショットを撮影するか（デフォルト: false） */
  fullPage?: boolean;
};

/**
 * snapshot出力の要素参照
 */
export type SnapshotRef = {
  name: string;
  role: string;
};

/**
 * snapshot出力の参照マップ
 */
export type SnapshotRefs = Record<string, SnapshotRef>;
