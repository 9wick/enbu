/**
 * コマンドバリデーター
 *
 * YAMLからパースされた未知の値を型安全なCommand型に変換する。
 */

import { type Result, ok, err } from 'neverthrow';
import type { Command, ParseError } from '../../types';
import { normalizers } from './type-guards';

/**
 * コマンドを検証してCommand型に変換する
 *
 * YAML形式の入力を正規化されたCommand型に変換する。
 * 不正な形式の場合はParseErrorを返す。
 *
 * @param rawCommand - YAMLからパースされた未知の値
 * @param commandIndex - コマンドのインデックス（エラーメッセージ用）
 * @returns 成功時: 正規化されたCommand、失敗時: ParseError
 */
export const validateCommand = (
  rawCommand: unknown,
  commandIndex: number,
): Result<Command, ParseError> => {
  // nullやundefinedのチェック
  if (rawCommand === null || rawCommand === undefined) {
    return err({
      type: 'invalid_command',
      message: 'Command must be an object',
      commandIndex,
      commandContent: rawCommand,
    });
  }

  // オブジェクトでない場合
  if (typeof rawCommand !== 'object') {
    return err({
      type: 'invalid_command',
      message: `Command must be an object, got ${typeof rawCommand}`,
      commandIndex,
      commandContent: rawCommand,
    });
  }

  // 全てのnormalizerを試行
  for (const normalizer of normalizers) {
    const result = normalizer(rawCommand);
    if (result !== null) {
      return ok(result);
    }
  }

  // どの型にもマッチしない
  return err({
    type: 'invalid_command',
    message: 'Unknown or invalid command format',
    commandIndex,
    commandContent: rawCommand,
  });
};
