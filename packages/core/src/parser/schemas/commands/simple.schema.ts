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

import {
  type FilePath,
  FilePathSchema,
  type JsExpression,
  JsExpressionSchema,
  type KeyboardKey,
  KeyboardKeySchema,
  type Url,
  UrlSchema,
} from '@packages/agent-browser-adapter';
import * as v from 'valibot';
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
      v.description('URL to open'),
      v.metadata({ exampleValues: ['https://example.com', 'https://google.com'] }),
    ),
  }),
  v.description('URLを開く'),
  v.metadata({ category: 'Navigation' }),
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
      v.description('Key to press'),
      v.metadata({ exampleValues: ['Enter', 'Escape', 'Tab', 'ArrowDown'] }),
    ),
  }),
  v.description('キーを押す'),
  v.metadata({ category: 'Interaction' }),
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
// KeydownCommand
// ============================================================================

/**
 * KeydownコマンドYAMLスキーマ（Single Source of Truth）
 *
 * keydown: "Enter" → { command: 'keydown', key: KeyboardKey }
 *
 * キーを押下する（押したまま）。Branded TypeのKeyboardKeyとして型安全に変換。
 */
export const KeydownYamlSchema = v.pipe(
  v.object({
    keydown: v.pipe(
      KeyboardKeySchema,
      v.description('Key to press down'),
      v.metadata({ exampleValues: ['Shift', 'Control', 'Alt', 'Enter'] }),
    ),
  }),
  v.description('キーを押下する（押したまま）'),
  v.metadata({ category: 'Interaction' }),
  v.transform((input): { command: 'keydown'; key: KeyboardKey } => ({
    command: 'keydown',
    key: input.keydown,
  })),
);

/**
 * KeydownYamlSchemaの入力型
 */
export type KeydownYamlInput = v.InferInput<typeof KeydownYamlSchema>;

/**
 * KeydownCommand型（Single Source of Truth）
 */
export type KeydownCommand = v.InferOutput<typeof KeydownYamlSchema>;

// ============================================================================
// KeyupCommand
// ============================================================================

/**
 * KeyupコマンドYAMLスキーマ（Single Source of Truth）
 *
 * keyup: "Shift" → { command: 'keyup', key: KeyboardKey }
 *
 * キーを離す。Branded TypeのKeyboardKeyとして型安全に変換。
 */
export const KeyupYamlSchema = v.pipe(
  v.object({
    keyup: v.pipe(
      KeyboardKeySchema,
      v.description('Key to release'),
      v.metadata({ exampleValues: ['Shift', 'Control', 'Alt', 'Enter'] }),
    ),
  }),
  v.description('キーを離す'),
  v.metadata({ category: 'Interaction' }),
  v.transform((input): { command: 'keyup'; key: KeyboardKey } => ({
    command: 'keyup',
    key: input.keyup,
  })),
);

/**
 * KeyupYamlSchemaの入力型
 */
export type KeyupYamlInput = v.InferInput<typeof KeyupYamlSchema>;

/**
 * KeyupCommand型（Single Source of Truth）
 */
export type KeyupCommand = v.InferOutput<typeof KeyupYamlSchema>;

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
      v.description('Screenshot save path'),
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
        v.description('Screenshot save path'),
        v.metadata({ exampleValues: ['./screenshot.png', './output/screen.png'] }),
      ),
      full: v.optional(
        v.pipe(
          v.boolean(),
          v.description('Whether to take a full-page screenshot'),
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
  v.metadata({ category: 'Capture' }),
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
      v.description('JavaScript code to execute'),
      v.metadata({ exampleValues: ['console.log("hello")', 'document.title'] }),
    ),
  }),
  v.description('JavaScriptを実行する'),
  v.metadata({ category: 'Other' }),
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

// ============================================================================
// PdfCommand
// ============================================================================

/**
 * Pdf簡略形式スキーマ
 *
 * pdf: "./path.pdf" → { command: 'pdf', path: FilePath }
 *
 * パスのみを指定した場合。
 * Branded TypeのFilePathとして型安全に変換。
 */
const PdfShorthandSchema = v.pipe(
  v.object({
    pdf: v.pipe(
      FilePathSchema,
      v.description('PDF save path'),
      v.metadata({ exampleValues: ['./output.pdf', './report/document.pdf'] }),
    ),
  }),
  v.transform((input): { command: 'pdf'; path: FilePath } => ({
    command: 'pdf',
    path: input.pdf,
  })),
);

/**
 * Pdf詳細形式スキーマ
 *
 * pdf: { path: "..." } → { command: 'pdf', path: FilePath }
 *
 * パスを明示的に指定。将来的にオプション追加可能。
 * Branded TypeのFilePathとして型安全に変換。
 */
const PdfDetailedSchema = v.pipe(
  v.object({
    pdf: v.object({
      path: v.pipe(
        FilePathSchema,
        v.description('PDF save path'),
        v.metadata({ exampleValues: ['./output.pdf', './report/document.pdf'] }),
      ),
    }),
  }),
  v.transform((input): { command: 'pdf'; path: FilePath } => ({
    command: 'pdf',
    path: input.pdf.path,
  })),
);

/**
 * PdfコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 簡略形式と詳細形式の両方を受け付ける。
 * - 簡略形式: pdf: "./path.pdf"
 * - 詳細形式: pdf: { path: "..." }
 */
export const PdfYamlSchema = v.pipe(
  v.union([PdfShorthandSchema, PdfDetailedSchema]),
  v.description('ページをPDFとして保存する'),
  v.metadata({ category: 'Capture' }),
);

/**
 * PdfYamlSchemaの入力型
 */
export type PdfYamlInput = v.InferInput<typeof PdfYamlSchema>;
