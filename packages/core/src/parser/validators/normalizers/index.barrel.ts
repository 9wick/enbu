/**
 * コマンド正規化関数の統合エクスポート
 *
 * commandSchemas（Single Source of Truth）から全てのnormalizerを生成する。
 * 各スキーマに対してsafeParseを呼び出すnormalizerを動的に作成。
 *
 * スキーマの出力はBranded Type化されたCommand型。
 * validateCommandではnormalizerの結果をそのままCommandとして使用可能。
 */

import { safeParse } from 'valibot';
import type { Command } from '../../../types';
import { commandSchemas, type CommandSchema } from '../../schemas/command-registry';

/**
 * スキーマからnormalizer関数を生成
 *
 * safeParseを使用してスキーマに対して検証を行い、
 * 成功した場合は変換後の値（Branded Type化されたCommand）を返す。
 *
 * @param schema - valibotスキーマ（出力型はCommand）
 * @returns normalizer関数
 */
const createNormalizer = (schema: CommandSchema) => {
  return (value: unknown): Command | null => {
    const result = safeParse(schema, value);
    if (result.success) {
      // CommandSchema型により、result.outputはCommand型として推論される
      return result.output;
    }
    return null;
  };
};

/**
 * 全てのnormalizer関数をまとめた配列
 *
 * commandSchemas（SSoT）から動的に生成される。
 * validateCommandで順次試行される。
 * 成功した場合、Branded Type化されたCommandを返す。
 */
export const normalizers: Array<(value: unknown) => Command | null> = commandSchemas.map((entry) =>
  createNormalizer(entry.schema),
);
