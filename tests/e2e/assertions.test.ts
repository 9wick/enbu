import { describe, it, expect } from 'vitest';
import { runCli, createTempFlowWithPort } from '../utils/test-helpers';
import { getE2EServerPort } from '../utils/e2e-test-helpers';
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
 * - グローバルセットアップでHTTPサーバーが起動していること
 */
describe('E2E: Assertion Tests', () => {
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
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること（assertVisibleが成功）
        expect(result.value).toBeCliSuccess();
      }
    } finally {
      await cleanup();
    }
  }, 90000); // タイムアウト: 90秒

  /**
   * E-ASSERT-2: assertEnabled
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に有効なボタン「有効ボタン」が存在する
   * - assertions.enbu.yaml に assertEnabled: 有効ボタン が含まれる
   *
   * 検証項目:
   * - assertEnabled コマンドで有効なボタンが検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-2: assertEnabled - 有効なボタンが検出される', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること（assertEnabledが成功）
        expect(result.value).toBeCliSuccess();
      }
    } finally {
      await cleanup();
    }
  }, 60000);

  /**
   * E-ASSERT-3: assertChecked
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html にチェック済みチェックボックス「チェック済みチェックボックス」が存在する
   * - assertions.enbu.yaml に assertChecked: チェック済みチェックボックス が含まれる
   *
   * 検証項目:
   * - assertChecked コマンドでチェック済みのチェックボックスが検出される
   * - アサーションが成功する
   */
  it('E-ASSERT-3: assertChecked - チェック済みのチェックボックスが検出される', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること（assertCheckedが成功）
        expect(result.value).toBeCliSuccess();
      }
    } finally {
      await cleanup();
    }
  }, 60000);

  /**
   * E-ASSERT-4: assertChecked (unchecked)
   *
   * 前提条件:
   * - tests/fixtures/html/assertions.html に未チェックチェックボックス「未チェックチェックボックス」が存在する
   * - assertions.enbu.yaml に assertChecked: { text: 未チェックチェックボックス, checked: false } が含まれる
   *
   * 検証項目:
   * - assertChecked コマンドで未チェックのチェックボックスが検出される（checked: falseで検証）
   * - アサーションが成功する
   */
  it('E-ASSERT-4: assertChecked (unchecked) - 未チェックのチェックボックスが検出される', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/assertions.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること（assertCheckedが成功）
        expect(result.value).toBeCliSuccess();
      }
    } finally {
      await cleanup();
    }
  }, 60000);
});
