/**
 * パースエラー型定義
 *
 * フローパース時に発生しうる全てのエラーケースを
 * 判別可能なユニオン型として定義する。
 */

import type { NoInfo } from './utility-types';

/**
 * フローパース時のエラー型
 */
export type ParseError =
  | {
      /** YAMLの構文エラー */
      type: 'yaml_syntax_error';
      message: string;
      line: number | NoInfo;
      column: number | NoInfo;
    }
  | {
      /** フロー構造が不正 */
      type: 'invalid_flow_structure';
      message: string;
      details: string;
    }
  | {
      /** コマンド形式が不正 */
      type: 'invalid_command';
      message: string;
      commandIndex: number;
      commandContent: unknown;
    }
  | {
      /** 環境変数が未定義 */
      type: 'undefined_variable';
      message: string;
      variableName: string;
      location: string;
    }
  | {
      /** ファイル読み込みエラー */
      type: 'file_read_error';
      message: string;
      filePath: string;
      cause: string;
    };
