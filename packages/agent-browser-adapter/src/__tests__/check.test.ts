import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';

// spawn のモック
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { checkAgentBrowser } from '../check';

/**
 * モックプロセスを作成するヘルパー
 */
const createMockProcess = (options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: Error;
}): ChildProcess => {
  const proc = new EventEmitter() as ChildProcess;

  // stdout/stderr のモック
  proc.stdout = new EventEmitter() as unknown as typeof proc.stdout;
  proc.stderr = new EventEmitter() as unknown as typeof proc.stderr;

  // 非同期で結果を発行
  setTimeout(() => {
    if (options.error) {
      proc.emit('error', options.error);
      return;
    }

    if (options.stdout) {
      proc.stdout?.emit('data', Buffer.from(options.stdout));
    }
    if (options.stderr) {
      proc.stderr?.emit('data', Buffer.from(options.stderr));
    }
    proc.emit('close', options.exitCode ?? 0);
  }, 0);

  return proc;
};

describe('checkAgentBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * C-1: agent-browserがインストールされている場合
   *
   * 前提条件: agent-browser --help が exitCode 0 で終了
   * 検証項目: ok("agent-browser is installed") が返される
   */
  it('C-1: agent-browserがインストールされている場合、成功メッセージを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const result = await checkAgentBrowser();

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (message) => expect(message).toBe('agent-browser is installed'),
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * C-2: agent-browserがインストールされていない場合（ENOENT）
   *
   * 前提条件: spawn が ENOENT エラーを発行
   * 検証項目: err({ type: 'not_installed', ... }) が返される
   */
  it('C-2: ENOENTエラーの場合、not_installedエラーを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({
      error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }),
    });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const result = await checkAgentBrowser();

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('not_installed');
        if (error.type === 'not_installed') {
          expect(error.message).toContain('not installed');
        }
      },
    );
  });

  /**
   * C-3: agent-browserがエラー終了した場合
   *
   * 前提条件: agent-browser --help が exitCode 1 で終了
   * 検証項目: err({ type: 'not_installed', ... }) が返される
   */
  it('C-3: exitCode !== 0 の場合、not_installedエラーを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 1 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const result = await checkAgentBrowser();

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('not_installed');
        if (error.type === 'not_installed') {
          expect(error.message).toContain('exit code 1');
        }
      },
    );
  });
});
