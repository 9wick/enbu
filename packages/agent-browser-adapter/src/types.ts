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
 * 例: "#login-button", ".submit", "div", "[data-testid='x']", "button.primary"
 * 空文字列は許可されない
 */
const CssSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'CSSセレクタは空文字列にできません'),
  valibot.brand('CssSelector'),
);
export type CssSelector = valibot.InferOutput<typeof CssSelectorSchema>;

/**
 * Ref形式セレクタ
 *
 * agent-browser snapshot由来の要素参照
 * 形式: @ + 英数字 (例: @e1, @e2, @login)
 */
const RefSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^@[a-zA-Z0-9]+$/, 'RefSelectorは@で始まり英数字が続く形式です'),
  valibot.brand('RefSelector'),
);
export type RefSelector = valibot.InferOutput<typeof RefSelectorSchema>;

/**
 * テキストセレクタ
 *
 * 要素のテキスト内容で検索するためのセレクタ
 * 実行時にsnapshot→テキストマッチ→RefSelectorに変換される
 * 空文字列は許可されない
 */
const TextSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'TextSelectorは空文字列にできません'),
  valibot.brand('TextSelector'),
);
export type TextSelector = valibot.InferOutput<typeof TextSelectorSchema>;

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
const UrlSchema = valibot.pipe(
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
const FilePathSchema = valibot.pipe(
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
const KeyboardKeySchema = valibot.pipe(
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
const JsExpressionSchema = valibot.pipe(
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
    | 'textSelector'
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
 * TextSelectorとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はTextSelector型、失敗時はBrandValidationError
 */
export const asTextSelector = (value: string): Result<TextSelector, BrandValidationError> => {
  const result = valibot.safeParse(TextSelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'TextSelectorは空文字列にできません',
    field: 'textSelector',
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
