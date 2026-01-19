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
// Brand型定義（valibotのbrand関数で実装）
// agent-browserと同様にmin(1)で空文字列を禁止
// ==========================================

/**
 * CSSセレクタまたは@ref形式のセレクタ
 *
 * 例: "#login-button", ".submit", "@e1", "text=\"ログイン\""
 * 空文字列は許可されない（agent-browserのz.string().min(1)に対応）
 */
const SelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'セレクタは空文字列にできません'),
  valibot.brand('Selector'),
);
export type Selector = valibot.InferOutput<typeof SelectorSchema>;

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
  field: 'selector' | 'url' | 'filePath' | 'keyboardKey' | 'jsExpression';
  /** 検証に失敗した値 */
  value: string;
};

// ==========================================
// Brand型のファクトリ関数（Result型を返す）
// agent-browserのz.string().min(1)に対応した検証を実行
// ==========================================

/**
 * セレクタとして検証・変換
 *
 * 空文字列の場合はエラーを返す
 *
 * @param value - 検証する文字列
 * @returns 検証成功時はSelector型、失敗時はBrandValidationError
 */
export const asSelector = (value: string): Result<Selector, BrandValidationError> => {
  const result = valibot.safeParse(SelectorSchema, value);
  if (result.success) {
    return ok(result.output);
  }
  return err({
    type: 'brand_validation_error',
    message: 'セレクタは空文字列にできません',
    field: 'selector',
    value,
  });
};

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
 * 全てのagent-browser関連操作で発生しうるエラーを含む
 */
export type AgentBrowserError =
  | {
      type: 'not_installed';
      message: string;
    }
  | {
      type: 'command_failed';
      message: string;
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      errorMessage: string | null;
    }
  | {
      type: 'timeout';
      command: string;
      args: readonly string[];
      timeoutMs: number;
    }
  | {
      type: 'parse_error';
      message: string;
      rawOutput: string;
    }
  | {
      type: 'assertion_failed';
      message: string;
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      errorMessage: string | null;
    }
  | {
      type: 'validation_error';
      message: string;
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      errorMessage: string | null;
    }
  | {
      /** agent-browserの出力JSONのパース・検証に失敗した場合のエラー */
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
