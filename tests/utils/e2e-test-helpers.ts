/**
 * E2Eテスト用ヘルパー関数
 *
 * グローバルセットアップで起動したHTTPサーバーのポートを取得し、
 * テストで使用するためのユーティリティを提供する。
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * グローバルセットアップで起動したHTTPサーバーのポートを取得する
 *
 * globalSetupとworkerプロセス間で環境変数が共有されないため、
 * ファイル経由でポート番号を取得する。
 *
 * @returns サーバーのポート番号
 * @throws ポートが設定されていない場合
 */
export const getE2EServerPort = (): number => {
  // まず環境変数を確認（同一プロセスの場合）
  const envPort = process.env.E2E_SERVER_PORT;
  if (envPort) {
    return parseInt(envPort, 10);
  }

  // ファイルから読み込む（workerプロセスの場合）
  try {
    const portFilePath = join(process.cwd(), 'tests', '.e2e-server-port');
    const port = readFileSync(portFilePath, 'utf-8').trim();
    return parseInt(port, 10);
  } catch {
    throw new Error(
      'E2Eサーバーのポートが取得できません。グローバルセットアップが正しく実行されていることを確認してください。',
    );
  }
};
