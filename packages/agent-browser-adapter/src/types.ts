/**
 * agent-browser-adapter の型定義
 *
 * このファイルで定義される型は全て外部に公開される。
 * 内部でのみ使う型は各ファイル内で定義すること。
 */

import type * as v from 'valibot';
import * as valibot from 'valibot';

// ==========================================
// Brand型定義（valibotのbrand関数で実装）
// ==========================================

/**
 * CSSセレクタまたは@ref形式のセレクタ
 *
 * 例: "#login-button", ".submit", "@e1", "text=\"ログイン\""
 */
const SelectorSchema = valibot.pipe(valibot.string(), valibot.brand('Selector'));
export type Selector = valibot.InferOutput<typeof SelectorSchema>;

/**
 * URL文字列
 *
 * 例: "https://example.com"
 */
const UrlSchema = valibot.pipe(valibot.string(), valibot.brand('Url'));
export type Url = valibot.InferOutput<typeof UrlSchema>;

/**
 * ファイルパス文字列
 *
 * 例: "./screenshots/result.png"
 */
const FilePathSchema = valibot.pipe(valibot.string(), valibot.brand('FilePath'));
export type FilePath = valibot.InferOutput<typeof FilePathSchema>;

/**
 * キーボードキー名
 *
 * 例: "Enter", "Tab", "Escape"
 */
const KeyboardKeySchema = valibot.pipe(valibot.string(), valibot.brand('KeyboardKey'));
export type KeyboardKey = valibot.InferOutput<typeof KeyboardKeySchema>;

/**
 * JavaScript式
 *
 * 例: "document.title", "window.scrollY > 100"
 */
const JsExpressionSchema = valibot.pipe(valibot.string(), valibot.brand('JsExpression'));
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
// Brand型のファクトリ関数（変換なし、型付けのみ）
// valibotのparseを使用して安全に型変換
// ==========================================

/**
 * セレクタとしてマーク（変換なし、型付けのみ）
 */
export const asSelector = (value: string): Selector => valibot.parse(SelectorSchema, value);

/**
 * URLとしてマーク（変換なし、型付けのみ）
 */
export const asUrl = (value: string): Url => valibot.parse(UrlSchema, value);

/**
 * ファイルパスとしてマーク（変換なし、型付けのみ）
 */
export const asFilePath = (value: string): FilePath => valibot.parse(FilePathSchema, value);

/**
 * キーボードキーとしてマーク（変換なし、型付けのみ）
 */
export const asKeyboardKey = (value: string): KeyboardKey =>
  valibot.parse(KeyboardKeySchema, value);

/**
 * JavaScript式としてマーク（変換なし、型付けのみ）
 */
export const asJsExpression = (value: string): JsExpression =>
  valibot.parse(JsExpressionSchema, value);

// ==========================================
// エラー型
// ==========================================

/**
 * agent-browserのエラー型
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
    };

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
