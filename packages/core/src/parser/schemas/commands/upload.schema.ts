/**
 * Uploadコマンドスキーマ定義
 *
 * YAML入力形式のuploadコマンドをvalibotで検証・変換する。
 *
 * 対応形式:
 * - upload: { css: "...", files: "..." } → 単一ファイル
 * - upload: { css: "...", files: ["...", "..."] } → 複数ファイル
 * - upload: { text: "...", files: "..." } → テキストセレクタ + 単一ファイル
 * - upload: { xpath: "...", files: ["...", "..."] } → XPathセレクタ + 複数ファイル
 *
 * Single Source of Truth:
 * - UploadYamlSchema: Runtime版スキーマ（brand/transform込み）
 * - JSON Schema生成には typeMode: 'input' を使用
 *
 * 出力型:
 * - UploadCommand: スキーマから導出されるBranded Type
 */

import {
  type CssSelector,
  type FilePath,
  FilePathSchema,
  InteractableTextSelectorSchema as InteractableTextBrandedSchema,
  type InteractableTextSelector,
  type XpathSelector,
} from '@packages/agent-browser-adapter';
import * as v from 'valibot';

// ============================================================================
// UploadCommand
// ============================================================================

/**
 * 各セレクタ型を明示的に定義（transform出力の型安全性のため）
 *
 * 全てBranded Type + files（単一または配列）。
 */
type UploadWithCss = { command: 'upload'; css: CssSelector; files: FilePath | FilePath[] };
type UploadWithInteractableText = {
  command: 'upload';
  interactableText: InteractableTextSelector;
  files: FilePath | FilePath[];
};
type UploadWithXpath = { command: 'upload'; xpath: XpathSelector; files: FilePath | FilePath[] };

/**
 * filesフィールドスキーマ
 *
 * 単一ファイルパスまたは複数ファイルパスの配列を受け付ける。
 * FilePathのBranded Typeを使用。
 */
const FilesSchema = v.pipe(
  v.union([
    FilePathSchema,
    v.pipe(v.array(FilePathSchema), v.minLength(1, 'ファイル配列は空にできません')),
  ]),
  v.description('File path(s) to upload'),
  v.metadata({
    exampleValues: ['/path/to/file.pdf', ['/path/to/file1.pdf', '/path/to/file2.jpg']],
  }),
);

/**
 * upload: { css: "...", files: "..." } または { css: "...", files: ["..."] }
 */
const UploadCssSchema = v.pipe(
  v.object({
    upload: v.object({
      css: v.pipe(
        v.string(),
        v.minLength(1, 'CSSセレクタは空文字列にできません'),
        v.regex(
          /^[a-zA-Z#.[:*]/,
          'CSSセレクタはタグ名、#、.、[、:、* のいずれかで始まる必要があります',
        ),
        v.brand('CssSelector'),
        v.description('Specify file input element by CSS selector'),
        v.metadata({ exampleValues: ['input[type="file"]', '#file-upload'] }),
      ),
      files: FilesSchema,
    }),
  }),
  v.metadata({ description: 'Upload files to element specified by CSS selector' }),
  v.transform(
    (input): UploadWithCss => ({
      command: 'upload',
      css: input.upload.css,
      files: input.upload.files,
    }),
  ),
);

/**
 * upload: { text: "...", files: "..." } または { text: "...", files: ["..."] }
 *
 * YAML入力形式は text を使用し、内部で interactableText に変換される。
 */
const UploadTextSchema = v.pipe(
  v.object({
    upload: v.object({
      text: v.pipe(
        v.string(),
        v.minLength(1, 'textセレクタは空文字列にできません'),
        v.description('テキスト内容で要素を検索'),
        v.metadata({ exampleValues: ['ファイル選択', 'Upload file'] }),
      ),
      files: FilesSchema,
    }),
  }),
  v.metadata({ description: 'Upload files to element specified by text' }),
  v.transform((input): UploadWithInteractableText => {
    // Branded Typeを適用（InteractableTextBrandedSchemaを通す）
    const parsed = v.parse(InteractableTextBrandedSchema, input.upload.text);
    return {
      command: 'upload',
      interactableText: parsed,
      files: input.upload.files,
    };
  }),
);

/**
 * upload: { xpath: "...", files: "..." } または { xpath: "...", files: ["..."] }
 */
const UploadXpathSchema = v.pipe(
  v.object({
    upload: v.object({
      xpath: v.pipe(
        v.string(),
        v.minLength(1, 'XPathセレクタは空文字列にできません'),
        v.regex(/^\//, 'XPathセレクタは / で始まる必要があります'),
        v.brand('XpathSelector'),
        v.description('Specify file input element by XPath'),
        v.metadata({ exampleValues: ["//input[@type='file']"] }),
      ),
      files: FilesSchema,
    }),
  }),
  v.metadata({ description: 'Upload files to element specified by XPath' }),
  v.transform(
    (input): UploadWithXpath => ({
      command: 'upload',
      xpath: input.upload.xpath,
      files: input.upload.files,
    }),
  ),
);

/**
 * UploadコマンドYAMLスキーマ（Single Source of Truth）
 *
 * 3種類のセレクタをunionで組み合わせる。
 *
 * JSON Schema生成には typeMode: 'input' を使用し、
 * このRuntime版スキーマから入力形式のJSON Schemaを生成する。
 */
export const UploadYamlSchema = v.pipe(
  v.union([UploadCssSchema, UploadTextSchema, UploadXpathSchema]),
  v.description('ファイルをアップロードする'),
  v.metadata({ category: 'Input' }),
);

/**
 * UploadYamlSchemaの入力型
 */
export type UploadYamlInput = v.InferInput<typeof UploadYamlSchema>;

/**
 * UploadCommand型（Single Source of Truth）
 */
export type UploadCommand = v.InferOutput<typeof UploadYamlSchema>;
