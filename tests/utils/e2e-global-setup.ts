/**
 * E2Eテストのグローバルセットアップ・ティアダウン
 *
 * 全E2Eテストで共有するHTTPサーバーを起動・停止する。
 * サーバーのポート番号は環境変数 E2E_SERVER_PORT で各テストに伝達する。
 *
 * これにより、describe.concurrent による並列実行時も
 * 全テストが同じサーバーを使用できる。
 */

import { createServer } from 'node:http';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

/** グローバルサーバーインスタンス */
let server: Server | null = null;

/**
 * HTTPリクエストハンドラー
 *
 * tests/fixtures/html/ 配下のファイルを配信する。
 */
const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const fixturesDir = join(process.cwd(), 'tests', 'fixtures', 'html');
  const filename = req.url?.slice(1) || 'index.html';
  const filePath = join(fixturesDir, filename);

  try {
    const content = await readFile(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
};

/**
 * サーバーがリクエストを受け付けられるようになるまで待機
 */
const waitForServerReady = async (port: number, maxRetries = 10): Promise<void> => {
  const baseUrl = `http://localhost:${port}`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseUrl);
      if (response.status === 200 || response.status === 404) {
        return;
      }
    } catch {
      // 接続エラーは無視してリトライ
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`サーバーが起動しませんでした: ${baseUrl}`);
};

/**
 * グローバルセットアップ
 *
 * テスト用HTTPサーバーを起動し、ポート番号を環境変数に設定する。
 */
export const setup = async (): Promise<void> => {
  server = createServer((req, res) => {
    handleRequest(req, res).catch(() => {
      res.writeHead(500);
      res.end('Internal Server Error');
    });
  });

  // ポート0で起動し、空きポートを自動選択
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(0, () => {
      server!.removeListener('error', reject);
      resolve();
    });
  });

  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;

  if (port === 0) {
    throw new Error('サーバーのポート取得に失敗しました');
  }

  // サーバーが実際にリクエストを受け付けられるまで待機
  await waitForServerReady(port);

  // ポートをファイルに書き出して伝達（workerプロセスからも読めるように）
  const { writeFileSync } = await import('node:fs');
  const portFilePath = join(process.cwd(), 'tests', '.e2e-server-port');
  writeFileSync(portFilePath, String(port), 'utf-8');

  // 環境変数でも設定（念のため）
  process.env.E2E_SERVER_PORT = String(port);

  // eslint-disable-next-line no-console
  console.log(`\n[E2E Global Setup] Server started on port ${port}\n`);
};

/**
 * グローバルティアダウン
 *
 * HTTPサーバーを停止し、残存セッションをクリーンアップする。
 */
export const teardown = async (): Promise<void> => {
  // サーバーを停止
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    server = null;
  }

  // ポートファイルを削除
  const { unlinkSync } = await import('node:fs');
  const portFilePath = join(process.cwd(), 'tests', '.e2e-server-port');
  try {
    unlinkSync(portFilePath);
  } catch {
    // ファイルがない場合は無視
  }

  // enbu-* セッションをクリーンアップ
  try {
    execSync('npx enbu cleanup', {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: 'inherit',
    });
  } catch {
    // クリーンアップ失敗は無視
  }
};
