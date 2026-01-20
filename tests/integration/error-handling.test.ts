import { describe, it, expect } from 'vitest';
import { runCli } from '../utils/test-helpers';

/**
 * エラーハンドリング統合テスト
 *
 * CLIプロセスとしてのエラーハンドリングを検証します。
 * 実際にCLIプロセスを起動し、各種エラーケースで適切なエラーメッセージと終了コードが返されることを確認します。
 *
 * 注: フロー実行時のエラー（タイムアウト、アサーション失敗など）はE2Eテスト（tests/e2e/error-cases.test.ts）で検証します。
 * このテストは「CLIレイヤーでのエラーハンドリング」に焦点を当てています。
 */
describe('Error Handling Integration Tests', () => {
  /**
   * I-ERR-1: 存在しないファイル
   *
   * 前提条件: 指定されたファイルが存在しない
   * 検証項目: ファイルが見つからないエラーメッセージと非0終了コード
   */
  it('I-ERR-1: 存在しないファイルでエラーメッセージを表示', async () => {
    // Act
    const result = await runCli(['non-existent-file.enbu.yaml']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('Failed to read file');
      expect(result.value.stderr).toContain('non-existent-file.enbu.yaml');
    }
  });

  /**
   * I-ERR-2: YAMLパースエラー
   *
   * 前提条件: tests/fixtures/flows/invalid.enbu.yaml が構文エラーを含む
   * 検証項目: 構文エラーの行番号と内容を表示
   */
  it('I-ERR-2: YAML構文エラーで行番号を表示', async () => {
    // Act
    const result = await runCli(['tests/fixtures/flows/invalid.enbu.yaml']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // エラーコードが0以外であることを確認
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('Failed to parse YAML');
      // YAMLのパースエラーには行番号が含まれる
      expect(result.value.stderr).toMatch(/line|Line/i);
    }
  });

  /**
   * I-ERR-3: 不明なアクション
   *
   * 前提条件: tests/fixtures/flows/unknown-action.enbu.yaml が存在
   * 検証項目: サポートされていないアクションのエラー
   */
  it('I-ERR-3: 不明なアクションで適切なエラーを表示', async () => {
    // Act
    const result = await runCli(['tests/fixtures/flows/unknown-action.enbu.yaml']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // エラーコードが0以外であることを確認
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('Failed to parse YAML');
      // 不明なアクションに関するエラーメッセージ
      expect(result.value.stderr).toMatch(/unknown|Unknown|invalid|Invalid/i);
    }
  });

  /**
   * I-ERR-4: 複数のエラーがある場合
   *
   * 前提条件: 複数の存在しないファイルを指定
   * 検証項目: 最初のエラーでエラーメッセージが表示され、非0終了コードが返される
   */
  it('I-ERR-4: 複数ファイル指定時に最初のエラーを表示', async () => {
    // Act
    const result = await runCli(['non-existent-1.enbu.yaml', 'non-existent-2.enbu.yaml']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      // 少なくとも1つのファイル名がエラーメッセージに含まれる
      expect(result.value.stderr).toMatch(/non-existent-1|non-existent-2/);
    }
  });

  /**
   * I-ERR-5: --env 値なしでエラーを返す
   *
   * 前提条件: なし
   * 検証項目: --env オプションに値を指定しない場合、エラーメッセージが表示される
   */
  it('I-ERR-5: --env 値なしでエラーを返す', async () => {
    // Act
    const result = await runCli(['--env']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('--env requires');
    }
  });

  /**
   * I-ERR-6: --parallel 不正な値でエラーを返す
   *
   * 前提条件: なし
   * 検証項目: --parallel オプションに不正な値を指定した場合、エラーメッセージが表示される
   */
  it('I-ERR-6: --parallel 不正な値でエラーを返す', async () => {
    // Act
    const result = await runCli(['--parallel', '0']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('positive integer');
    }
  });

  /**
   * I-ERR-7: --timeout 不正な値でエラーを返す
   *
   * 前提条件: なし
   * 検証項目: --timeout オプションに不正な値を指定した場合、エラーメッセージが表示される
   */
  it('I-ERR-7: --timeout 不正な値でエラーを返す', async () => {
    // Act
    const result = await runCli(['--timeout', 'invalid']);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.exitCode).not.toBe(0);
      expect(result.value.stderr).toContain('positive number');
    }
  });
});
