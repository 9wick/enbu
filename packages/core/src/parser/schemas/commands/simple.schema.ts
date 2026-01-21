/**
 * シンプルコマンドスキーマ定義
 *
 * YAML入力形式のシンプルなコマンド（セレクタを使用しない）をvalibotで検証・変換する。
 *
 * 対応コマンド:
 * - open: URLを開く
 * - press: キーを押す
 * - snapshot: アクセシビリティスナップショットを取得
 * - screenshot: スクリーンショットを取得
 * - eval: JavaScriptを実行
 *
 * Single Source of Truth:
 * - 各*YamlSchema: Runtime版スキーマ（transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - OpenCommand, PressCommand, SnapshotCommand, ScreenshotCommand, EvalCommand: スキーマから導出される型
 */

import * as v from 'valibot';
import {
  UrlSchema,
  type Url,
  KeyboardKeySchema,
  type KeyboardKey,
  FilePathSchema,
  type FilePath,
  JsExpressionSchema,
  type JsExpression,
} from '@packages/agent-browser-adapter';
import { UseDefault } from '../../../types/utility-types';

// ============================================================================
// OpenCommand
// ============================================================================

/**
 * OpenコマンドYAMLスキーマ（Single Source of Truth）
 *
 * open: "https://..." → { command: 'open', url: Url }
 *
 * URLを開く。Branded TypeのUrlとして型安全に変換。
 */
export const OpenYamlSchema = v.pipe(
  v.object({
    open: v.pipe(
      UrlSchema,
      v.description('開くURL'),
      v.metadata({ exampleValues: ['https://example.com', 'https://google.com'] }),
    ),
  }),
  v.description('URLを開く'),
  v.metadata({ category: 'ナビゲーション' }),
  v.transform((input): { command: 'open'; url: Url } => ({
    command: 'open',
    url: input.open,
  })),
);

/**
 * OpenYamlSchemaの入力型
 */
export type OpenYamlInput = v.InferInput<typeof OpenYamlSchema>;

/**
 * OpenCommand型（Single Source of Truth）
 */
export type OpenCommand = v.InferOutput<typeof OpenYamlSchema>;

// ============================================================================
// PressCommand
// ============================================================================

/**
 * PressコマンドYAMLスキーマ（Single Source of Truth）
 *
 * press: "Enter" → { command: 'press', key: KeyboardKey }
 *
 * キーを押す。Branded TypeのKeyboardKeyとして型安全に変換。
 */
export const PressYamlSchema = v.pipe(
  v.object({
    press: v.pipe(
      KeyboardKeySchema,
      v.description('押すキー'),
      v.metadata({ exampleValues: ['Enter', 'Escape', 'Tab', 'ArrowDown'] }),
    ),
  }),
  v.description('キーを押す'),
  v.metadata({ category: 'インタラクション' }),
  v.transform((input): { command: 'press'; key: KeyboardKey } => ({
    command: 'press',
    key: input.press,
  })),
);

/**
 * PressYamlSchemaの入力型
 */
export type PressYamlInput = v.InferInput<typeof PressYamlSchema>;

/**
 * PressCommand型（Single Source of Truth）
 */
export type PressCommand = v.InferOutput<typeof PressYamlSchema>;

// ============================================================================
// ScreenshotCommand
// ============================================================================

/**
 * Screenshot簡略形式スキーマ
 *
 * screenshot: "./path.png" → { command: 'screenshot', path: FilePath, full: UseDefault }
 *
 * パスのみを指定した場合、fullオプションはデフォルト値を使用。
 * Branded TypeのFilePathとして型安全に変換。
 */
const ScreenshotShorthandSchema = v.pipe(
  v.object({
    screenshot: v.pipe(
      FilePathSchema,
      v.description('スクリーンショットの保存パス'),
      v.metadata({ exampleValues: ['./screenshot.png', './output/screen.png'] }),
    ),
  }),
  v.transform((input): { command: 'screenshot'; path: FilePath; full: typeof UseDefault } => ({
    command: 'screenshot',
    path: input.screenshot,
    full: UseDefault,
  })),
);

/**
 * Screenshot詳細形式スキーマ
 *
 * screenshot: { path: "...", full?: boolean } → { command: 'screenshot', path: FilePath, full: boolean | UseDefault }
 *
 * パスとfullオプションを明示的に指定。
 * Branded TypeのFilePathとして型安全に変換。
 */
const ScreenshotDetailedSchema = v.pipe(
  v.object({
    screenshot: v.object({
      path: v.pipe(
        FilePathSchema,
        v.description('スクリーンショットの保存パス'),
        v.metadata({ exampleValues: ['./screenshot.png', './output/screen.png'] }),
      ),
      full: v.optional(
        v.pipe(
          v.boolean(),
          v.description('フルページスクリーンショットを取得するか'),
          v.metadata({ exampleValues: [true, false] }),
        ),
      ),
    }),
  }),
  v.transform(
    (input): { command: 'screenshot'; path: FilePath; full: boolean | typeof UseDefault } => ({
      command: 'screenshot',
      path: input.screenshot.path,
      full: input.screenshot.full ?? UseDefault,
    }),
  ),
);

/**
 * ScreenshotコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * - 簡略形式: screenshot: "./path.png"
 * - 詳細形式: screenshot: { path: "...", full?: boolean }
 *
 * fullオプションが指定されない場合、UseDefaultシンボルを使用。
 */
export const ScreenshotYamlSchema = v.pipe(
  v.union([ScreenshotShorthandSchema, ScreenshotDetailedSchema]),
  v.description('スクリーンショットを取得する'),
  v.metadata({ category: 'キャプチャ' }),
);

/**
 * ScreenshotYamlSchemaの入力型
 */
export type ScreenshotYamlInput = v.InferInput<typeof ScreenshotYamlSchema>;

/**
 * ScreenshotCommand型（Single Source of Truth）
 */
export type ScreenshotCommand = v.InferOutput<typeof ScreenshotYamlSchema>;

// ============================================================================
// EvalCommand
// ============================================================================

/**
 * EvalコマンドYAMLスキーマ（Single Source of Truth）
 *
 * eval: "console.log('hello')" → { command: 'eval', script: JsExpression }
 *
 * JavaScriptを実行する。Branded TypeのJsExpressionとして型安全に変換。
 */
export const EvalYamlSchema = v.pipe(
  v.object({
    eval: v.pipe(
      JsExpressionSchema,
      v.description('実行するJavaScriptコード'),
      v.metadata({ exampleValues: ['console.log("hello")', 'document.title'] }),
    ),
  }),
  v.description('JavaScriptを実行する'),
  v.metadata({ category: 'その他' }),
  v.transform((input): { command: 'eval'; script: JsExpression } => ({
    command: 'eval',
    script: input.eval,
  })),
);

/**
 * EvalYamlSchemaの入力型
 */
export type EvalYamlInput = v.InferInput<typeof EvalYamlSchema>;

/**
 * EvalCommand型（Single Source of Truth）
 */
export type EvalCommand = v.InferOutput<typeof EvalYamlSchema>;
