/**
 * スキーマエクスポート
 *
 * valibotスキーマをSingle Source of Truthとして、
 * YAML入力形式の検証・変換を行う。
 *
 * Runtime版スキーマのみをエクスポートする。
 * JSON Schema生成には typeMode: 'input' を使用。
 */

export { SelectorSpecSchema } from './selector.schema';
