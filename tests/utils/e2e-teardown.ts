/**
 * E2Eテスト終了後のクリーンアップ処理
 *
 * テスト実行中に作成されたagent-browserセッション（enbu-*）を
 * 全て終了させる。これにより、テスト後にセッションが残り続けることを防ぐ。
 *
 * `npx enbu cleanup`コマンドを使用してenbu-*セッションを一括クリーンアップする。
 */

import { execSync } from 'node:child_process';

/**
 * グローバルセットアップ（何もしない）
 *
 * vitestのglobalSetupファイルにはsetupとteardownの両方をexportする必要がある。
 * setupは空の関数として定義する。
 */
export const setup = (): void => {
  // 何もしない
};

/**
 * enbu-* セッションを全てクローズする
 *
 * `npx enbu cleanup`コマンドを実行して、enbu-*プレフィックスを持つ
 * 全てのセッションをクリーンアップする。
 *
 * vitestのglobalSetupのteardownとして、テスト終了後に呼ばれる。
 */
export const teardown = (): void => {
  try {
    execSync('npx enbu cleanup', {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: 'inherit',
    });
  } catch {
    // クリーンアップ失敗は無視（セッションがない場合等）
  }
};
