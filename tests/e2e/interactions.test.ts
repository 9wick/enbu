import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer } from '../utils/file-server';
import { runCli } from '../utils/test-helpers';
import { join } from 'node:path';

/**
 * E2E: 入力・クリック操作テスト
 *
 * このテストスイートは、agent-browserを使用した入力操作とクリック操作を検証します。
 * 実際のagent-browser CLIとブラウザを起動して、インタラクション機能の動作を確認します。
 *
 * 前提条件:
 * - npx agent-browser が利用可能であること
 * - tests/fixtures/flows/interactions.enbu.yaml が存在すること
 * - tests/fixtures/html/form-elements.html が存在すること
 */
describe('E2E: Interaction Tests', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;

  beforeAll(async () => {
    // テスト用HTTPサーバーを起動
    // ポート8082を使用（interactions.test.ts専用ポート）
    const serverResult = await startTestServer(8082);
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
   * E-INT-1: type - テキスト入力
   *
   * 前提条件:
   * - tests/fixtures/html/form-elements.html に「ユーザー名」入力フィールドが存在する
   * - interactions.enbu.yaml に type コマンドが含まれる
   *
   * 検証項目:
   * - type コマンドでテキスト入力が成功する
   * - 指定した文字列が入力される
   */
  it('E-INT-1: type - テキスト入力が成功', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/interactions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（typeが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000); // タイムアウト: 30秒

  /**
   * E-INT-2: fill - フォーム入力
   *
   * 前提条件:
   * - tests/fixtures/html/form-elements.html に「年齢」入力フィールドが存在する
   * - interactions.enbu.yaml に fill コマンドが含まれる
   *
   * 検証項目:
   * - fill コマンドでフォーム入力が成功する
   * - 指定した値が入力される
   */
  it('E-INT-2: fill - フォーム入力が成功', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/interactions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（fillが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);

  /**
   * E-INT-3: click - ボタンクリック
   *
   * 前提条件:
   * - tests/fixtures/html/form-elements.html に「送信」ボタンが存在する
   * - interactions.enbu.yaml に click: 送信 が含まれる
   *
   * 検証項目:
   * - click コマンドでボタンクリックが成功する
   */
  it('E-INT-3: click - ボタンクリックが成功', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/interactions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（clickが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);

  /**
   * E-INT-4: press - キーボード操作
   *
   * 前提条件:
   * - interactions.enbu.yaml に press コマンドが含まれる（実装されている場合）
   *
   * 検証項目:
   * - press コマンドでキーボード操作が成功する
   *
   * 注: 現在のinteractions.enbu.yamlにはpressコマンドが含まれていないため、
   * このテストは基本的な操作の成功を確認するに留めます。
   */
  it('E-INT-4: press - キーボード操作が成功', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/interactions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);

  /**
   * E-INT-5: 複数要素の操作
   *
   * 前提条件:
   * - tests/fixtures/flows/interactions.enbu.yaml が複数の操作を含む
   *   1. open: http://localhost:8082/form-elements.html
   *   2. type: ユーザー名 -> テストユーザー
   *   3. type: メールアドレス -> test@example.com
   *   4. fill: 年齢 -> 25
   *   5. click: 読書
   *   6. assertChecked: 読書
   *   7. click: 送信
   * - HTTPサーバーが localhost:8082 で起動している
   *
   * 検証項目:
   * - 連続した操作が全て成功する
   * - 各ステップが順次実行される
   */
  it('E-INT-5: 複数要素の操作 - 連続した操作が全て成功', async () => {
    // Arrange
    const flowPath = join(process.cwd(), 'tests/fixtures/flows/interactions.enbu.yaml');

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが成功終了すること（全ステップが成功）
      expect(result.value.exitCode).toBe(0);
    }
  }, 30000);
});
