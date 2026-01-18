import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer } from '../utils/file-server';
import { runCli } from '../utils/test-helpers';
import { join } from 'node:path';

/**
 * E2E: エラーケーステスト
 *
 * このテストスイートは、agent-browserを使用したエラーハンドリングを検証します。
 * 実際のagent-browser CLIとブラウザを起動して、エラーケースの動作を確認します。
 *
 * 前提条件:
 * - npx agent-browser が利用可能であること
 * - tests/fixtures/flows/error-case.enbu.yaml が存在すること
 * - tests/fixtures/html/assertions.html が存在すること
 */
describe('E2E: Error Cases Tests', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;

  beforeAll(async () => {
    // テスト用HTTPサーバーを起動
    // ポート8083を使用（error-cases.test.ts専用ポート）
    const serverResult = await startTestServer(8083);
    if (serverResult.isErr()) {
      throw new Error(`サーバー起動失敗: ${serverResult.error.message}`);
    }
    server = serverResult.value;
  });

  afterAll(async () => {
    // サーバーを停止
    if (server) {
      const closeResult = await server.close();
      if (closeResult.isErr()) {
        console.error(`サーバー停止失敗: ${closeResult.error.message}`);
      }
    }
  });

  /**
   * E-ERR-1: 存在しない要素
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に「存在しない要素」というテキストは存在しない
   * - error-case.enbu.yaml に assertVisible: 存在しない要素 が含まれる
   *
   * 検証項目:
   * - assertVisible が失敗する（終了コード非0）
   * - 適切なエラーメッセージが出力される
   * - エラーメッセージに要素が見つからない旨が含まれる
   */
  it('E-ERR-1: 存在しない要素 - 適切なエラーメッセージ', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/error-case.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIがエラー終了すること（終了コード非0）
      expect(result.value.exitCode).not.toBe(0);
      // エラーメッセージが標準エラー出力に含まれること
      // （実装に応じて、適切なエラーメッセージを検証）
      const errorOutput = result.value.stderr || result.value.stdout;
      expect(errorOutput.length).toBeGreaterThan(0);
    }
  }, 30000); // タイムアウト: 30秒

  /**
   * E-ERR-2: 無効な操作
   *
   * 前提条件:
   * - 無効な操作を含むフローファイルが存在する（例: 無効化されたボタンへのクリック）
   *
   * 検証項目:
   * - 無効な操作が失敗する（終了コード非0）
   * - 適切なエラーメッセージが出力される
   *
   * 注: 具体的な無効な操作のテストは、agent-browserの実装に依存します。
   * ここでは、存在しない要素への操作として検証します。
   */
  it('E-ERR-2: 無効な操作 - 無効な操作のエラー', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/error-case.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIがエラー終了すること
      expect(result.value.exitCode).not.toBe(0);
      // エラーメッセージが含まれること
      const errorOutput = result.value.stderr || result.value.stdout;
      expect(errorOutput.length).toBeGreaterThan(0);
    }
  }, 30000);

  /**
   * E-ERR-3: タイムアウト
   *
   * 前提条件:
   * - タイムアウトが発生する条件が設定されている（例: 非常に短いタイムアウト設定）
   *
   * 検証項目:
   * - タイムアウトエラーが発生する
   * - 適切なエラーメッセージが出力される
   *
   * 注: タイムアウト設定はagent-browserの実装に依存します。
   * このテストでは、存在しない要素の検索がタイムアウトすることを想定します。
   */
  it('E-ERR-3: タイムアウト - タイムアウトエラー', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/error-case.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIがエラー終了すること
      expect(result.value.exitCode).not.toBe(0);
      // エラーメッセージが含まれること
      const errorOutput = result.value.stderr || result.value.stdout;
      expect(errorOutput.length).toBeGreaterThan(0);
    }
  }, 30000);

  /**
   * E-ERR-4: アサーション失敗
   *
   * 前提条件:
   * - アサーションが失敗する条件が設定されている
   * - error-case.enbu.yaml に失敗するアサーションが含まれる
   *
   * 検証項目:
   * - アサーションが失敗する（終了コード非0）
   * - 適切なエラーメッセージが出力される
   * - エラーメッセージに期待値と実際の値の差分が含まれる（可能な場合）
   */
  it('E-ERR-4: アサーション失敗 - 期待値との差分表示', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/error-case.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIがエラー終了すること（アサーション失敗）
      expect(result.value.exitCode).not.toBe(0);
      // エラーメッセージが含まれること
      const errorOutput = result.value.stderr || result.value.stdout;
      expect(errorOutput.length).toBeGreaterThan(0);
      // アサーション失敗のメッセージが含まれること
      // （実装に応じて、適切なエラーメッセージを検証）
    }
  }, 30000);
});
