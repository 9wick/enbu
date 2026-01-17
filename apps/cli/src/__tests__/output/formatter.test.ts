import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutputFormatter } from '../../output/formatter';

describe('OutputFormatter', () => {
  let stdoutWrite: typeof process.stdout.write;
  let stderrWrite: typeof process.stderr.write;
  let stdoutCalls: string[];
  let stderrCalls: string[];

  beforeEach(() => {
    stdoutWrite = process.stdout.write;
    stderrWrite = process.stderr.write;
    stdoutCalls = [];
    stderrCalls = [];

    process.stdout.write = vi.fn((chunk: unknown) => {
      stdoutCalls.push(chunk?.toString() ?? '');
      return true;
    }) as unknown as typeof process.stdout.write;

    process.stderr.write = vi.fn((chunk: unknown) => {
      stderrCalls.push(chunk?.toString() ?? '');
      return true;
    }) as unknown as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  });

  /**
   * F-1: info() で stdout に出力
   *
   * 前提条件: formatter.info('Test message')
   * 検証項目: process.stdout.write が 'Test message\n' で呼ばれる
   */
  it('F-1: info()でstdoutに出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.info('Test message');

    // Assert
    expect(stdoutCalls).toContain('Test message\n');
  });

  /**
   * F-2: error() で stderr に出力
   *
   * 前提条件: formatter.error('Error message')
   * 検証項目: process.stderr.write が 'Error message\n' で呼ばれる
   */
  it('F-2: error()でstderrに出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.error('Error message');

    // Assert
    expect(stderrCalls).toContain('Error message\n');
  });

  /**
   * F-3: debug() で verbose=true 時に出力
   *
   * 前提条件: verbose=true, formatter.debug('Debug message')
   * 検証項目: process.stderr.write が '[DEBUG] Debug message\n' で呼ばれる
   */
  it('F-3: verbose=trueの場合、debug()がstderrに出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(true);

    // Act
    formatter.debug('Debug message');

    // Assert
    expect(stderrCalls).toContain('[DEBUG] Debug message\n');
  });

  /**
   * F-4: debug() で verbose=false 時に出力しない
   *
   * 前提条件: verbose=false, formatter.debug('Debug message')
   * 検証項目: process.stderr.write が呼ばれない
   */
  it('F-4: verbose=falseの場合、debug()は出力されない', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.debug('Debug message');

    // Assert
    expect(stderrCalls).toHaveLength(0);
  });

  /**
   * F-5: success() で ✓ マーク付き出力
   *
   * 前提条件: formatter.success('Operation succeeded', 1500)
   * 検証項目: '  ✓ Operation succeeded (1.5s)\n' が出力される
   */
  it('F-5: success()で成功マーク付きメッセージが出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.success('Operation succeeded', 1500);

    // Assert
    expect(stdoutCalls).toContain('  ✓ Operation succeeded (1.5s)\n');
  });

  /**
   * F-6: failure() で ✗ マーク付き出力
   *
   * 前提条件: formatter.failure('Operation failed', 2000)
   * 検証項目: '  ✗ Operation failed (2.0s)\n' が出力される
   */
  it('F-6: failure()で失敗マーク付きメッセージが出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.failure('Operation failed', 2000);

    // Assert
    expect(stderrCalls).toContain('  ✗ Operation failed (2.0s)\n');
  });

  /**
   * F-7: startSpinner() でスピナー開始
   *
   * 前提条件: formatter.startSpinner('Loading...')
   * 検証項目: スピナーフレームが定期的に描画される
   */
  it('F-7: startSpinner()でスピナーが開始される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);
    vi.useFakeTimers();

    // Act
    formatter.startSpinner('Loading...');

    // Assert（初回描画）
    expect(stdoutCalls.some((call) => call.includes('Loading...'))).toBe(true);

    // タイマーを進めてフレーム更新を確認
    vi.advanceTimersByTime(80);
    expect(stdoutCalls.length).toBeGreaterThan(1);

    // クリーンアップ
    formatter.stopSpinner();
    vi.useRealTimers();
  });

  /**
   * F-8: stopSpinner() でスピナー停止
   *
   * 前提条件: formatter.startSpinner() → formatter.stopSpinner()
   * 検証項目: インターバルがクリアされ、行がクリアされる
   */
  it('F-8: stopSpinner()でスピナーが停止される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);
    vi.useFakeTimers();

    // Act
    formatter.startSpinner('Loading...');
    const callsBeforeStop = stdoutCalls.length;
    formatter.stopSpinner();

    // タイマーを進めても描画されない
    vi.advanceTimersByTime(1000);
    expect(stdoutCalls.length).toBe(callsBeforeStop + 1); // clearLine分のみ

    // クリーンアップ
    vi.useRealTimers();
  });
});
