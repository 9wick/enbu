import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer } from '../utils/file-server';
import { runCli } from '../utils/test-helpers';
import { join } from 'node:path';

/**
 * E2E: アサーションテスト
 *
 * このテストスイートは、agent-browserを使用した各種アサーションコマンドを検証します。
 * 実際のagent-browser CLIとブラウザを起動して、アサーションの動作を確認します。
 *
 * 前提条件:
 * - npx agent-browser が利用可能であること
 * - tests/fixtures/flows/assertions.enbu.yaml が存在すること
 * - tests/fixtures/html/assertions.html が存在すること
 */
describe('E2E: Assertion Tests', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;

  beforeAll(async () => {
    // テスト用HTTPサーバーを起動
    // ポート8081を使用（assertions.test.ts専用ポート）
    const serverResult = await startTestServer(8081);
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
   * E-ASSERT-1: assertVisible
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に可視要素「これは表示されています」が存在する
   * - assertions.enbu.yaml に assertVisible: これは表示されています が含まれる
   *
   * 検証項目:
   * - assertVisible コマンドで可視要素が検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-1: assertVisible - 可視要素が検出される', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（assertVisibleが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000); // タイムアウト: 30秒

  /**
   * E-ASSERT-2: assertEnabled
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に有効なボタン「有効」が存在する
   * - assertions.enbu.yaml に assertEnabled: 有効 が含まれる
   *
   * 検証項目:
   * - assertEnabled コマンドで有効なボタンが検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-2: assertEnabled - 有効なボタンが検出される', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（assertEnabledが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);

  /**
   * E-ASSERT-3: assertDisabled
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に無効なボタン「無効」が存在する
   * - assertions.enbu.yaml に assertDisabled: 無効 が含まれる
   *
   * 検証項目:
   * - assertDisabled コマンドで無効なボタンが検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-3: assertDisabled - 無効なボタンが検出される', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（assertDisabledが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);

  /**
   * E-ASSERT-4: assertChecked
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html にチェック済みのチェックボックス「チェック済み」が存在する
   * - assertions.enbu.yaml に assertChecked: チェック済み が含まれる
   *
   * 検証項目:
   * - assertChecked コマンドでチェック済みのチェックボックスが検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-4: assertChecked - チェック済みのチェックボックスが検出される', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（assertCheckedが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);

  /**
   * E-ASSERT-5: assertUnchecked
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に未チェックのチェックボックス「未チェック」が存在する
   * - assertions.enbu.yaml に assertUnchecked: 未チェック が含まれる
   *
   * 検証項目:
   * - assertUnchecked コマンドで未チェックのチェックボックスが検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-5: assertUnchecked - 未チェックのチェックボックスが検出される', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（assertUncheckedが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);
});
