import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';

// spawn のモック
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { executeCommand } from './executor';

/**
 * モックプロセスを作成するヘルパー
 */
const createMockProcess = (options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: Error;
  noEmit?: boolean;
}): ChildProcess => {
  const proc = new EventEmitter() as ChildProcess;
  proc.kill = vi.fn();

  // stdout/stderr のモック
  proc.stdout = new EventEmitter() as unknown as typeof proc.stdout;
  proc.stderr = new EventEmitter() as unknown as typeof proc.stderr;

  if (!options.noEmit) {
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
  }

  return proc;
};

describe('executeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * E-1: コマンド実行成功
   *
   * 前提条件: agent-browser open https://example.com --json が exitCode 0 で終了
   * 検証項目: ok(stdout) が返される
   */
  it('E-1: コマンド実行が成功した場合、stdoutを返す', async () => {
    // Arrange
    const expectedOutput = '{"success":true,"data":{"url":"https://example.com"},"error":null}';
    const mockProc = createMockProcess({
      stdout: expectedOutput,
      exitCode: 0,
    });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com', '--json']);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (stdout) => expect(stdout).toBe(expectedOutput),
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * E-2: コマンド実行失敗
   *
   * 前提条件: agent-browser click "NotExist" が exitCode 1 で終了
   * 検証項目: err({ type: 'command_failed', ... }) が返される
   */
  it('E-2: exitCode !== 0 の場合、command_failedエラーを返す', async () => {
    // Arrange
    const errorOutput = '{"success":false,"data":null,"error":"Element not found"}';
    const mockProc = createMockProcess({
      stdout: errorOutput,
      exitCode: 1,
    });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('click', ['NotExist', '--json']);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('command_failed');
        if (error.type === 'command_failed') {
          expect(error.command).toBe('click');
          expect(error.args).toEqual(['NotExist', '--json']);
          expect(error.exitCode).toBe(1);
          expect(error.rawError).toBe('Element not found');
        }
      },
    );
  });

  /**
   * E-3: タイムアウト
   *
   * 前提条件: コマンドがtimeoutMs以内に完了しない
   * 検証項目: err({ type: 'timeout', ... }) が返される
   */
  it('E-3: タイムアウトした場合、timeoutエラーを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({ noEmit: true }); // 完了しない
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://slow.example.com'], {
      timeoutMs: 1000,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('timeout');
        if (error.type === 'timeout') {
          expect(error.timeoutMs).toBe(1000);
        }
      },
    );
    expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
  });

  /**
   * E-4: sessionName オプション
   *
   * 前提条件: sessionName: 'my-session' を指定
   * 検証項目: spawn に '--session my-session' が渡される
   */
  it('E-4: sessionNameオプションが正しく渡される', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com'], {
      sessionName: 'my-session',
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Assert
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--session', 'my-session']),
      expect.any(Object),
    );
  });

  /**
   * E-5: headed オプション
   *
   * 前提条件: headed: true を指定
   * 検証項目: spawn に '--headed' が渡される
   */
  it('E-5: headedオプションが正しく渡される', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com'], {
      headed: true,
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Assert
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--headed']),
      expect.any(Object),
    );
  });

  /**
   * E-6: 引数の順序
   *
   * 前提条件: command='open', args=['url', '--json'], sessionName='sess', headed=true
   * 検証項目: 'agent-browser open url --json --session sess --headed' の順序
   */
  it('E-6: 引数が正しい順序で渡される', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com', '--json'], {
      sessionName: 'sess',
      headed: true,
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Assert
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toEqual([
      'agent-browser',
      'open',
      'https://example.com',
      '--json',
      '--session',
      'sess',
      '--headed',
    ]);
  });
});
