import { describe, it, expect } from 'vitest';
import { runCli, createTempFlowWithPort } from '../utils/test-helpers';
import { getE2EServerPort } from '../utils/e2e-test-helpers';
import { join } from 'node:path';

/**
 * E2E: 基本フローテスト
 *
 * このテストスイートは、agent-browserを使用した基本的なフロー実行を検証します。
 * 実際のagent-browser CLIとブラウザを起動して、エンドツーエンドでの動作を確認します。
 *
 * 前提条件:
 * - npx agent-browser が利用可能であること
 * - tests/fixtures/flows/simple.enbu.yaml が存在すること
 * - tests/fixtures/html/login-form.html が存在すること
 * - グローバルセットアップでHTTPサーバーが起動していること
 */
describe('E2E: Basic Flow Tests', () => {
  /**
   * E-BASIC-1: ページを開く
   *
   * 前提条件:
   * - tests/fixtures/flows/simple.enbu.yaml が存在する
   * - HTTPサーバーが起動している
   *
   * 検証項目:
   * - CLIが正常に起動する（終了コード0）
   * - open コマンドが成功する
   * - フロー実行が完了する
   */
  it('E-BASIC-1: ページを正常に開ける', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/simple.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること
        expect(result.value).toBeCliSuccess();
        // フロー実行完了のメッセージが出力されること
        // （実装に応じて、適切なメッセージを検証）
      }
    } finally {
      await cleanup();
    }
  }, 60000); // タイムアウト: 60秒

  /**
   * E-BASIC-2: 要素の存在確認
   *
   * 前提条件:
   * - tests/fixtures/html/login-form.html にh1要素「ログイン」が存在する
   * - simple.enbu.yaml に assertVisible: ログイン が含まれる
   * - HTTPサーバーが起動している
   *
   * 検証項目:
   * - assertVisible コマンドでh1要素「ログイン」が見つかる
   * - アサーションが成功する
   */
  it('E-BASIC-2: 要素の存在を確認できる', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/simple.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること
        expect(result.value).toBeCliSuccess();
        // assertVisible が成功したことを示すログが含まれる
        // （実装に応じて、適切なログメッセージを検証）
      }
    } finally {
      await cleanup();
    }
  }, 60000); // タイムアウト: 60秒

  /**
   * E-BASIC-3: 複数ステップの実行
   *
   * 前提条件:
   * - simple.enbu.yaml に複数のステップが定義されている
   * - HTTPサーバーが起動している
   *
   * 検証項目:
   * - 複数のステップが順番に実行される
   * - 全てのステップが成功する
   */
  it('E-BASIC-3: 複数ステップを順次実行できる', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/simple.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli([tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること
        expect(result.value).toBeCliSuccess();
        // 各ステップが実行されたことを示すログが含まれる
        // （実装に応じて、適切なログメッセージを検証）
      }
    } finally {
      await cleanup();
    }
  }, 60000); // タイムアウト: 60秒

  /**
   * E-BASIC-4: スクリーンショット機能
   *
   * 前提条件:
   * - simple.enbu.yaml に screenshot ステップが含まれる
   * - HTTPサーバーが起動している
   *
   * 検証項目:
   * - --screenshot フラグでスクリーンショットが有効になる
   * - フローが正常に完了する
   */
  it('E-BASIC-4: --screenshot フラグでフローを実行できる', async () => {
    // Arrange
    const fixturePath = join(process.cwd(), 'tests/fixtures/flows/simple.enbu.yaml');
    const { tempPath, cleanup } = await createTempFlowWithPort(fixturePath, getE2EServerPort());

    try {
      // Act
      const result = await runCli(['--screenshot', tempPath]);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // CLIが成功終了すること
        expect(result.value).toBeCliSuccess();
        // スクリーンショット機能は実装されているが、
        // 出力先を指定できないため、ファイルの存在確認は行わない
      }
    } finally {
      await cleanup();
    }
  }, 60000); // タイムアウト: 60秒
});
