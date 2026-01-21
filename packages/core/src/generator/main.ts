/**
 * ドキュメント生成スクリプト
 *
 * valibotスキーマからJSON SchemaとMarkdownドキュメントを生成する。
 * ビルド時に実行され、以下のファイルを出力:
 * - schemas/flow.schema.json
 * - docs/REFERENCE.md
 *
 * エラーが発生した場合はexit(1)でビルド失敗とする。
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSchemas } from '../parser/schemas/command-registry';
import { generateJsonSchema } from './to-json-schema';
import { generateMarkdownFromRegistry } from './to-markdown';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 出力ディレクトリのパス
 */
const CORE_ROOT = resolve(__dirname, '../..');
const SCHEMAS_DIR = resolve(CORE_ROOT, 'schemas');
const DOCS_DIR = resolve(CORE_ROOT, 'docs');

/**
 * 出力ファイルのパス
 */
const JSON_SCHEMA_PATH = resolve(SCHEMAS_DIR, 'flow.schema.json');
const MARKDOWN_PATH = resolve(DOCS_DIR, 'REFERENCE.md');

/**
 * ディレクトリが存在しない場合は作成
 */
const ensureDir = (dirPath: string): void => {
  mkdirSync(dirPath, { recursive: true });
};

/**
 * JSON Schemaを生成して保存
 */
const generateAndSaveJsonSchema = (): void => {
  console.log('JSON Schema生成中...');
  const schema = generateJsonSchema();
  const json = JSON.stringify(schema, null, 2);

  ensureDir(SCHEMAS_DIR);
  writeFileSync(JSON_SCHEMA_PATH, json, 'utf-8');
  console.log(`JSON Schema生成完了: ${JSON_SCHEMA_PATH}`);
};

/**
 * Markdownドキュメントを生成して保存
 *
 * commandSchemas（SSoT）から直接生成する。
 */
const generateAndSaveMarkdown = (): void => {
  console.log('Markdownドキュメント生成中...');
  const markdown = generateMarkdownFromRegistry(commandSchemas);

  ensureDir(DOCS_DIR);
  writeFileSync(MARKDOWN_PATH, markdown, 'utf-8');
  console.log(`Markdownドキュメント生成完了: ${MARKDOWN_PATH}`);
};

/**
 * メイン処理
 */
const main = (): void => {
  try {
    console.log('ドキュメント生成開始...');
    generateAndSaveJsonSchema();
    generateAndSaveMarkdown();
    console.log('ドキュメント生成完了');
    process.exit(0);
  } catch (error) {
    console.error('ドキュメント生成失敗:', error);
    process.exit(1);
  }
};

main();
