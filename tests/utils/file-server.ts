import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Result, err, ok } from 'neverthrow';

/**
 * テスト用HTTPサーバーの起動結果
 */
type TestServerResult = {
  /** サーバーのベースURL */
  url: string;
  /** 実際にリスンしているポート番号 */
  port: number;
  /** サーバーを停止する関数 */
  close: () => Promise<Result<void, ServerCloseError>>;
};

/**
 * サーバー起動エラー
 */
type ServerStartError = {
  /** エラータイプ */
  type: 'server_start_failed';
  /** エラーメッセージ */
  message: string;
  /** 元のエラー */
  cause?: unknown;
};

/**
 * サーバー停止エラー
 */
type ServerCloseError = {
  /** エラータイプ */
  type: 'server_close_failed';
  /** エラーメッセージ */
  message: string;
  /** 元のエラー */
  cause?: unknown;
};

/**
 * ファイル読み取りエラー
 */
type FileReadError = {
  /** エラータイプ */
  type: 'file_not_found';
  /** エラーメッセージ */
  message: string;
  /** ファイルパス */
  filePath: string;
};

/**
 * テスト用HTTPサーバーを起動する
 *
 * このサーバーは `tests/fixtures/html/` ディレクトリ配下のHTMLフィクスチャを配信します。
 * 全てのレスポンスは `text/html; charset=utf-8` として返されます。
 * 存在しないファイルがリクエストされた場合は404エラーを返します。
 *
 * @param port - リスンするポート番号（0を指定すると空きポートを自動選択）
 * @returns サーバーのURL、ポート番号、close関数を含むResult
 *
 * @example
 * ```typescript
 * // テスト前にサーバーを起動（空きポートを自動選択）
 * const serverResult = await startTestServer(0);
 * if (serverResult.isErr()) {
 *   throw new Error('サーバー起動失敗');
 * }
 * const server = serverResult.value;
 * console.log(`サーバー起動: ${server.url} (ポート: ${server.port})`);
 *
 * // テストロジック...
 * // const url = `${server.url}/login-form.html`;
 *
 * // テスト後にサーバーを停止
 * await server.close();
 * ```
 */
export const startTestServer = async (
  port = 0,
): Promise<Result<TestServerResult, ServerStartError>> => {
  // フィクスチャディレクトリのパスを解決
  const fixturesDir = join(process.cwd(), 'tests', 'fixtures', 'html');

  // HTTPサーバーを作成
  const server = createServer(async (req, res) => {
    // リクエストURLからファイル名を取得（先頭の'/'を除去）
    const filename = req.url?.slice(1) || 'index.html';
    const filePath = join(fixturesDir, filename);

    // ファイルの読み取りを試行
    const fileResult = await readFileContent(filePath);

    fileResult.match(
      (content) => {
        // ファイル読み取り成功: HTMLとして返す
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      },
      () => {
        // ファイル読み取り失敗: 404を返す
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      },
    );
  });

  // サーバーの起動を試行
  const listenResult = await listenServer(server, port);
  if (listenResult.isErr()) {
    return listenResult;
  }

  const listeningServer = listenResult.value;
  const address = listeningServer.address();
  const actualPort = typeof address === 'object' && address !== null ? address.port : port;
  const baseUrl = `http://localhost:${actualPort}`;

  // ヘルスチェック: サーバーがリクエストを受け付けられるまで待機
  const healthCheckResult = await waitForServerReady(baseUrl);
  if (healthCheckResult.isErr()) {
    // ヘルスチェック失敗時はサーバーを閉じてエラーを返す
    await closeServer(listeningServer);
    return err(healthCheckResult.error);
  }

  return ok({
    url: baseUrl,
    port: actualPort,
    close: async () => closeServer(listeningServer),
  });
};

/**
 * ファイルの内容を読み取る
 *
 * @param filePath - 読み取るファイルのパス
 * @returns ファイル内容のResult
 */
const readFileContent = async (filePath: string): Promise<Result<string, FileReadError>> => {
  try {
    const content = await readFile(filePath, 'utf-8');
    return ok(content);
  } catch (error) {
    return err({
      type: 'file_not_found',
      message: `ファイルが見つかりません: ${filePath}`,
      filePath,
    });
  }
};

/**
 * サーバーがリクエストを受け付けられるようになるまで待機する
 *
 * この関数は、サーバーがlisten後に実際にHTTPリクエストを処理できる状態になるまで
 * ポーリングを行います。これにより、テストの初期化フェーズでのレースコンディションを防ぎます。
 *
 * @param baseUrl - サーバーのベースURL
 * @param maxRetries - 最大リトライ回数（デフォルト: 10）
 * @param retryIntervalMs - リトライ間隔（ミリ秒、デフォルト: 100）
 * @returns 成功時: void、失敗時: ServerStartError
 */
const waitForServerReady = async (
  baseUrl: string,
  maxRetries = 10,
  retryIntervalMs = 100,
): Promise<Result<void, ServerStartError>> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseUrl);
      // 404でもOK（サーバーが応答している）
      if (response.status === 200 || response.status === 404) {
        return ok(undefined);
      }
    } catch {
      // 接続エラーは無視してリトライ
    }
    await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
  }

  return err({
    type: 'server_start_failed',
    message: `サーバーが起動しませんでした: ${baseUrl} (${maxRetries}回リトライ後)`,
  });
};

/**
 * サーバーを指定ポートでリスンする
 *
 * @param server - HTTPサーバーインスタンス
 * @param port - リスンするポート番号
 * @returns リスン中のサーバーのResult
 */
const listenServer = async (
  server: Server,
  port: number,
): Promise<Result<Server, ServerStartError>> => {
  return new Promise((resolve) => {
    const errorHandler = (error: Error) => {
      resolve(
        err({
          type: 'server_start_failed',
          message: `サーバーの起動に失敗しました: ${error.message}`,
          cause: error,
        }),
      );
    };

    // エラーハンドラーを一時的に設定
    server.once('error', errorHandler);

    server.listen(port, () => {
      // リスン成功時はエラーハンドラーを削除
      server.removeListener('error', errorHandler);
      resolve(ok(server));
    });
  });
};

/**
 * サーバーを停止する
 *
 * @param server - 停止するHTTPサーバーインスタンス
 * @returns 停止結果のResult
 */
const closeServer = async (server: Server): Promise<Result<void, ServerCloseError>> => {
  return new Promise((resolve) => {
    server.close((error) => {
      if (error) {
        resolve(
          err({
            type: 'server_close_failed',
            message: `サーバーの停止に失敗しました: ${error.message}`,
            cause: error,
          }),
        );
      } else {
        resolve(ok(undefined));
      }
    });
  });
};
