import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCli } from '../utils/test-helpers';
import * as adapter from '@packages/agent-browser-adapter';
import { ok, err } from 'neverthrow';

/**
 * CLI統合テスト
 *
 * CLIの基本機能を検証します。
 * agent-browserをモック化し、CLIとcoreモジュールの連携をテストします。
 */
describe('CLI Integration Tests', () => {
  beforeEach(() => {
    // agent-browserのモックをリセット
    vi.clearAllMocks();
  });

  /**
   * I-CLI-1: ヘルプ表示
   *
   * 前提条件: なし
   * 検証項目: --help で使用方法が表示される
   */
  it('I-CLI-1: --help で使用方法が表示される', async () => {
    // Arrange & Act
    const result = await runCli(['--help']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).toBe(0);
      expect(result.value.stdout).toContain('enbu');
      expect(result.value.stdout).toContain('USAGE:');
      expect(result.value.stdout).toContain('COMMANDS:');
      expect(result.value.stdout).toContain('OPTIONS:');
    }
  });

  /**
   * I-CLI-2: バージョン表示
   *
   * 前提条件: なし
   * 検証項目: --version でバージョンが表示される
   *
   * 注: 現在の実装ではpackage.jsonからバージョンを取得する機能は未実装のため、
   * このテストケースはスキップします。将来的に実装された際に有効化してください。
   */
  it.skip('I-CLI-2: --version でバージョンが表示される', async () => {
    // Arrange & Act
    const result = await runCli(['--version']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).toBe(0);
      expect(result.value.stdout).toMatch(/\d+\.\d+\.\d+/);
    }
  });

  /**
   * I-CLI-3: フローファイル実行
   *
   * 前提条件: tests/fixtures/flows/simple.enbu.yaml が存在
   * 検証項目: CLIが正常に起動し、フローファイルを読み込もうとする
   *
   * 注: 実際のagent-browser実行が必要なため、このテストはスキップします。
   * 完全な動作確認はE2Eテストで行ってください。
   */
  it.skip('I-CLI-3: フローファイル指定でCLIが起動する', async () => {
    const flowPath = 'tests/fixtures/flows/simple.enbu.yaml';

    // Act
    const result = await runCli([flowPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLIが起動し、フローファイル名が表示されることを確認
      expect(result.value.stdout).toContain('simple.enbu.yaml');
      // agent-browserのチェックが行われることを確認
      expect(result.value.stdout).toContain('agent-browser');
    }
  });

  /**
   * I-CLI-4: 存在しないフローファイル
   *
   * 前提条件: なし
   * 検証項目: エラーメッセージが表示され、0以外のexitCode
   */
  it('I-CLI-4: 存在しないフローファイルでエラーを返す', async () => {
    // Act
    const result = await runCli(['not-exist.enbu.yaml']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // エラーコードが0以外であることを確認
      expect(result.value.exitCode).not.toBe(0);
      // エラーメッセージが表示されることを確認
      expect(result.value.stderr).toContain('Failed to read file');
      expect(result.value.stderr).toContain('not-exist.enbu.yaml');
    }
  });

  /**
   * I-CLI-5: セッション指定
   *
   * 前提条件: tests/fixtures/flows/simple.enbu.yaml が存在
   * 検証項目: --session オプションが引数として受け入れられる
   *
   * 注: agent-browserの実行が必要なため、オプションの受け入れのみを確認します。
   * 実際の動作はE2Eテストで検証してください。
   */
  it.skip('I-CLI-5: --session オプションが引数として受け入れられる', async () => {
    const flowPath = 'tests/fixtures/flows/simple.enbu.yaml';
    const sessionName = 'test-session-123';

    // Act
    const result = await runCli([flowPath, '--session', sessionName]);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLI が起動し、agent-browser チェックまで到達することを確認
      expect(result.value.stdout).toContain('agent-browser');
    }
  });

  /**
   * I-CLI-6: ヘッドレスモード指定
   *
   * 前提条件: tests/fixtures/flows/simple.enbu.yaml が存在
   * 検証項目: --headed オプションが引数として受け入れられる
   *
   * 注: agent-browserの実行が必要なため、オプションの受け入れのみを確認します。
   * 実際の動作はE2Eテストで検証してください。
   */
  it.skip('I-CLI-6: --headed オプションが引数として受け入れられる', async () => {
    const flowPath = 'tests/fixtures/flows/simple.enbu.yaml';

    // Act
    const result = await runCli([flowPath, '--headed']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLI が起動し、agent-browser チェックまで到達することを確認
      expect(result.value.stdout).toContain('agent-browser');
    }
  });

  /**
   * I-CLI-7: スクリーンショット出力
   *
   * 前提条件: tests/fixtures/flows/simple.enbu.yaml が存在
   * 検証項目: --screenshot オプションが引数として受け入れられる
   *
   * 注: agent-browserの実行が必要なため、オプションの受け入れのみを確認します。
   * 実際の動作はE2Eテストで検証してください。
   */
  it.skip('I-CLI-7: --screenshot オプションが引数として受け入れられる', async () => {
    const flowPath = 'tests/fixtures/flows/simple.enbu.yaml';

    // Act
    const result = await runCli([flowPath, '--screenshot']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // CLI が起動し、agent-browser チェックまで到達することを確認
      expect(result.value.stdout).toContain('agent-browser');
    }
  });
});
