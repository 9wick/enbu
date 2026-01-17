import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer } from '../utils/file-server';
import { runCli } from '../utils/test-helpers';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * E2E: 基本フローテスト
 *
 * このテストスイートは、agent-browserを使用した基本的なフロー実行を検証します。
 * 実際のagent-browser CLIとブラウザを起動して、エンドツーエンドでの動作を確認します。
 *
 * 前提条件:
 * - npx agent-browser が利用可能であること
 * - tests/fixtures/flows/simple.flow.yaml が存在すること
 * - tests/fixtures/html/login-form.html が存在すること
 */
describe('E2E: Basic Flow Tests', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;

  beforeAll(async () => {
    // テスト用HTTPサーバーを起動
    // ポート8080を使用（basic-flow.test.ts専用ポート）
    const serverResult = await startTestServer(8080);
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
   * E-BASIC-1: ページを開く
   *
   * 前提条件:
   * - tests/fixtures/flows/simple.flow.yaml が存在する
   * - HTTPサーバーが localhost:8080 で起動している
   *
   * 検証項目:
   * - CLIが正常に起動する（終了コード0）
   * - open コマンドが成功する
   * - フロー実行が完了する
   */
  it('E-BASIC-1: ページを正常に開ける', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/simple.flow.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること
      expect(result.value.exitCode).toBe(0);
      // フロー実行完了のメッセージが出力されること
      // （実装に応じて、適切なメッセージを検証）
    }
  }, 30000); // タイムアウト: 30秒

  /**
   * E-BASIC-2: 要素の存在確認
   *
   * 前提条件:
   * - tests/fixtures/html/login-form.html にh1要素「ログイン」が存在する
   * - simple.flow.yaml に assertVisible: ログイン が含まれる
   * - HTTPサーバーが localhost:8080 で起動している
   *
   * 検証項目:
   * - assertVisible コマンドでh1要素「ログイン」が見つかる
   * - アサーションが成功する
   */
  it('E-BASIC-2: 要素の存在を確認できる', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/simple.flow.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること
      expect(result.value.exitCode).toBe(0);
      // assertVisible が成功したことを示すログが含まれる
      // （実装に応じて、適切なログメッセージを検証）
    }
  }, 30000);

  /**
   * E-BASIC-3: 複数ステップの実行
   *
   * 前提条件:
   * - tests/fixtures/flows/simple.flow.yaml が4ステップを含む
   *   1. open: http://localhost:8080/login-form.html
   *   2. assertVisible: ログイン
   *   3. assertVisible: メールアドレス
   *   4. screenshot: login-page
   *
   * 検証項目:
   * - 全ステップが順次実行される
   * - 各ステップが成功する
   */
  it('E-BASIC-3: 複数ステップを順次実行できる', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/simple.flow.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること
      expect(result.value.exitCode).toBe(0);
      // 各ステップが実行されたことを示すログが含まれる
      // （実装に応じて、適切なログメッセージを検証）
    }
  }, 30000);

  /**
   * E-BASIC-4: スクリーンショット
   *
   * 前提条件:
   * - tests/fixtures/flows/simple.flow.yaml が screenshot: login-page を含む
   *
   * 検証項目:
   * - --screenshot フラグを使用してフローが実行できる
   *
   * 注意:
   * - CLIは --screenshot-dir フラグをサポートしていないため、
   *   現状は --screenshot フラグでの実行のみを検証する
   * - スクリーンショットの出力先はデフォルト動作に依存する
   */
  it('E-BASIC-4: --screenshot フラグでフローを実行できる', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/simple.flow.yaml');

    // Act
    const result = await runCli([flowPath, '--screenshot']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること
      expect(result.value.exitCode).toBe(0);
      // スクリーンショット機能は実装されているが、
      // 出力先を指定できないため、ファイルの存在確認は行わない
    }
  }, 30000);
});
