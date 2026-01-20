import { describe, it, expect } from 'vitest';
import { runCli } from '../utils/test-helpers';

/**
 * CLI統合テスト
 *
 * CLIプロセスとしての基本機能を検証します。
 * 実際にCLIプロセスを起動し、引数パース・エラー表示・終了コードが正しく動作することを確認します。
 *
 * 注: フロー実行の動作確認はE2Eテスト（tests/e2e/）で行います。
 * このテストは「CLIとしての振る舞い」に焦点を当てています。
 */
describe('CLI Integration Tests', () => {
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
   * 検証項目: --version でバージョンが表示される（セマンティックバージョン形式）
   */
  it('I-CLI-2: --version でバージョンが表示される', async () => {
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
   * I-CLI-3: 不正なオプションでエラーを返す
   *
   * 前提条件: なし
   * 検証項目: 存在しないオプションを指定した場合、エラーメッセージと非0終了コードが返される
   */
  it('I-CLI-3: 不正なオプションでエラーを返す', async () => {
    // Act
    const result = await runCli(['--invalid-option']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('Unknown option');
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
   * I-CLI-5: --session 値なしでエラーを返す
   *
   * 前提条件: なし
   * 検証項目: --session オプションに値を指定しない場合、エラーメッセージが表示される
   */
  it('I-CLI-5: --session 値なしでエラーを返す', async () => {
    // Act
    const result = await runCli(['--session']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('--session requires');
    }
  });

  /**
   * I-CLI-6: --timeout 値なしでエラーを返す
   *
   * 前提条件: なし
   * 検証項目: --timeout オプションに値を指定しない場合、エラーメッセージが表示される
   */
  it('I-CLI-6: --timeout 値なしでエラーを返す', async () => {
    // Act
    const result = await runCli(['--timeout']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('--timeout requires');
    }
  });

  /**
   * I-CLI-7: --env 不正な形式でエラーを返す
   *
   * 前提条件: なし
   * 検証項目: --env オプションにKEY=VALUE形式でない値を指定した場合、エラーメッセージが表示される
   */
  it('I-CLI-7: --env 不正な形式でエラーを返す', async () => {
    // Act
    const result = await runCli(['--env', 'INVALID_FORMAT']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('KEY=VALUE format');
    }
  });
});
