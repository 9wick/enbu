/**
 * フロー定義の型
 *
 * このファイルではフロー全体を表す型を定義する。
 */
import type { Command } from './commands';

/**
 * フロー内の環境変数定義
 *
 * YAMLの env セクションから読み込まれる。
 * 全ての値は文字列として扱われる。
 */
export type FlowEnv = Readonly<Record<string, string>>;

/**
 * フロー定義
 *
 * YAMLファイルから読み込まれたフロー全体を表す。
 * env セクション（オプション）とコマンドシーケンスで構成される。
 */
export type Flow = {
  /** フロー名（ファイル名から取得） */
  name: string;
  /** フロー内で定義された環境変数 */
  env: FlowEnv;
  /** 実行するステップのシーケンス */
  steps: readonly Command[];
};
