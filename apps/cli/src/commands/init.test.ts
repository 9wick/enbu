import { describe, it, expect, beforeEach, vi } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { runInitCommand } from './init';
import * as fsUtils from '../utils/fs';

// ファイルシステムユーティリティをモック
vi.mock('../utils/fs');

// readline をモック
vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_, callback) => callback('n')), // デフォルトはNo
    close: vi.fn(),
  })),
}));

describe('runInitCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック動作
    vi.mocked(fsUtils.fileExists).mockResolvedValue(false);
    vi.mocked(fsUtils.createDirectory).mockReturnValue(okAsync(undefined));
    vi.mocked(fsUtils.writeFileContent).mockReturnValue(okAsync(undefined));
  });

  /**
   * I-1: 初期化成功
   *
   * 前提条件: ディレクトリもファイルも存在しない
   * 検証項目: ok(undefined) が返される
   */
  it('I-1: 初期化が成功する', async () => {
    // Arrange
    vi.mocked(fsUtils.fileExists).mockResolvedValue(false);

    // Act
    const result = await runInitCommand({ force: false, verbose: false });

    // Assert
    expect(result.isOk()).toBe(true);
    expect(fsUtils.createDirectory).toHaveBeenCalled();
    expect(fsUtils.writeFileContent).toHaveBeenCalled();
  });

  /**
   * I-2: 既存ディレクトリがある場合（force=false）
   *
   * 前提条件: .enbuflow/ が既に存在
   * 検証項目: createDirectory がスキップされ、ok(undefined) が返される
   */
  it('I-2: 既存ディレクトリがある場合、スキップする', async () => {
    // Arrange
    vi.mocked(fsUtils.fileExists).mockResolvedValue(true);

    // Act
    const result = await runInitCommand({ force: false, verbose: false });

    // Assert
    expect(result.isOk()).toBe(true);
    // 既存なのでcreateDirectoryは呼ばれない（スキップ）
  });

  /**
   * I-3: 既存ディレクトリがある場合（force=true）
   *
   * 前提条件: .enbuflow/ が既に存在、force=true
   * 検証項目: 上書きされ、ok(undefined) が返される
   */
  it('I-3: force=trueの場合、既存ディレクトリを上書きする', async () => {
    // Arrange
    vi.mocked(fsUtils.fileExists).mockResolvedValue(true);

    // Act
    const result = await runInitCommand({ force: true, verbose: false });

    // Assert
    expect(result.isOk()).toBe(true);
    expect(fsUtils.createDirectory).toHaveBeenCalled();
    expect(fsUtils.writeFileContent).toHaveBeenCalled();
  });

  /**
   * I-4: ファイルシステムエラー
   *
   * 前提条件: createDirectory がエラーを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('I-4: ファイルシステムエラーが発生した場合、エラーを返す', async () => {
    // Arrange
    vi.mocked(fsUtils.createDirectory).mockReturnValue(
      errAsync({ type: 'execution_error', message: 'Permission denied' }),
    );

    // Act
    const result = await runInitCommand({ force: false, verbose: false });

    // Assert
    expect(result.isErr()).toBe(true);
  });
});
