/**
 * JSON Schema生成
 *
 * valibotスキーマからJSON Schemaを生成する。
 * @valibot/to-json-schemaを使用。
 *
 * Runtime版スキーマ（brand/transform込み）から入力形式のJSON Schemaを生成する。
 * - typeMode: 'input' でtransformより前の部分を使用
 * - ignoreActions: ['brand'] でbrandアクションを無視
 *
 * これによりSingle Source of Truthを維持する。
 */

import { toJsonSchema } from '@valibot/to-json-schema';
import { commandSchemas } from '../parser/schemas/command-registry';
import { InteractableSelectorSpecSchema, AnySelectorSpecSchema } from '../parser/schemas';

/**
 * JSON Schema生成の共通設定
 *
 * - typeMode: 'input' - transformより前の入力スキーマを使用
 * - ignoreActions: ['brand'] - brandアクションは入力検証に影響しないため無視
 */
const jsonSchemaConfig = {
  typeMode: 'input' as const,
  ignoreActions: ['brand'],
};

/**
 * コマンドスキーマのJSON Schema定義
 *
 * commandSchemas（SSoT）から動的に生成されるため、
 * 個別のプロパティ定義は不要。
 */
export type CommandJsonSchemaDefinitions = {
  interactableSelectorSpec: ReturnType<typeof toJsonSchema>;
  anySelectorSpec: ReturnType<typeof toJsonSchema>;
} & {
  [key: string]: ReturnType<typeof toJsonSchema>;
};

/**
 * 全体のJSON Schemaを生成
 *
 * Runtime版スキーマ（brand/transform込み）から typeMode: 'input' +
 * ignoreActions: ['brand'] で入力形式のJSON Schemaを生成する。
 *
 * commandSchemas（SSoT）から動的に全コマンドのスキーマを生成する。
 *
 * @returns JSON Schema オブジェクト
 */
export const generateJsonSchema = (): {
  $schema: string;
  definitions: CommandJsonSchemaDefinitions;
} => {
  // 基本定義
  const definitions: CommandJsonSchemaDefinitions = {
    interactableSelectorSpec: toJsonSchema(InteractableSelectorSpecSchema, jsonSchemaConfig),
    anySelectorSpec: toJsonSchema(AnySelectorSpecSchema, jsonSchemaConfig),
  };

  // commandSchemasから動的に全コマンドのスキーマを追加
  for (const entry of commandSchemas) {
    const key = `${entry.name}Command`;
    definitions[key] = toJsonSchema(entry.schema, jsonSchemaConfig);
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions,
  };
};
