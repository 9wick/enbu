import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Result } from 'neverthrow';
import type { AgentBrowserError } from '../types';

// executeCommand のモック
vi.mock('../executor', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '../executor';
import { closeSession } from '../session';

describe('closeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * S-1: セッションクローズ成功
   *
   * 前提条件: executeCommand が ok('') を返す
   * 検証項目:
   *   - closeSession の戻り値が ok(undefined) であること
   *   - executeCommand が ('close', [], { sessionName: 'test-session' }) で呼ばれたこと
   */
  it('S-1: セッションクローズが成功した場合、ok(undefined)を返す', async () => {
    // Arrange
    const mockExecuteCommand = vi.mocked(executeCommand);
    mockExecuteCommand.mockResolvedValue(ok(''));

    // Act
    const result = await closeSession('test-session');

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (value) => expect(value).toBeUndefined(),
      () => {
        throw new Error('Expected ok result');
      },
    );

    expect(mockExecuteCommand).toHaveBeenCalledWith('close', [], {
      sessionName: 'test-session',
    });
    expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
  });

  /**
   * S-2: セッションクローズ失敗（command_failed）
   *
   * 前提条件: executeCommand が err({ type: 'command_failed', ... }) を返す
   * 検証項目:
   *   - closeSession の戻り値が err であること
   *   - エラーオブジェクトが正しく返されること
   */
  it('S-2: executeCommandが失敗した場合、エラーをそのまま返す', async () => {
    // Arrange
    const mockExecuteCommand = vi.mocked(executeCommand);
    const expectedError: AgentBrowserError = {
      type: 'command_failed',
      message: 'Session not found',
      command: 'close',
      args: [],
      exitCode: 1,
      stderr: '',
      errorMessage: 'Session not found',
    };
    mockExecuteCommand.mockResolvedValue(err(expectedError) as Result<string, AgentBrowserError>);

    // Act
    const result = await closeSession('non-existent-session');

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('command_failed');
        if (error.type === 'command_failed') {
          expect(error.message).toBe('Session not found');
          expect(error.command).toBe('close');
          expect(error.args).toEqual([]);
          expect(error.exitCode).toBe(1);
          expect(error.errorMessage).toBe('Session not found');
        }
      },
    );

    expect(mockExecuteCommand).toHaveBeenCalledWith('close', [], {
      sessionName: 'non-existent-session',
    });
  });

  /**
   * S-3: セッションクローズ失敗（timeout）
   *
   * 前提条件: executeCommand が err({ type: 'timeout', ... }) を返す
   * 検証項目:
   *   - closeSession の戻り値が err であること
   *   - タイムアウトエラーが正しく返されること
   */
  it('S-3: executeCommandがタイムアウトした場合、timeoutエラーを返す', async () => {
    // Arrange
    const mockExecuteCommand = vi.mocked(executeCommand);
    const expectedError: AgentBrowserError = {
      type: 'timeout',
      command: 'close',
      args: [],
      timeoutMs: 30000,
    };
    mockExecuteCommand.mockResolvedValue(err(expectedError) as Result<string, AgentBrowserError>);

    // Act
    const result = await closeSession('timeout-session');

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('timeout');
        if (error.type === 'timeout') {
          expect(error.command).toBe('close');
          expect(error.timeoutMs).toBe(30000);
        }
      },
    );

    expect(mockExecuteCommand).toHaveBeenCalledWith('close', [], {
      sessionName: 'timeout-session',
    });
  });

  /**
   * S-4: セッションクローズ失敗（not_installed）
   *
   * 前提条件: executeCommand が err({ type: 'not_installed', ... }) を返す
   * 検証項目:
   *   - closeSession の戻り値が err であること
   *   - not_installedエラーが正しく返されること
   */
  it('S-4: agent-browserが利用できない場合、not_installedエラーを返す', async () => {
    // Arrange
    const mockExecuteCommand = vi.mocked(executeCommand);
    const expectedError: AgentBrowserError = {
      type: 'not_installed',
      message: 'agent-browser is not installed',
    };
    mockExecuteCommand.mockResolvedValue(err(expectedError) as Result<string, AgentBrowserError>);

    // Act
    const result = await closeSession('any-session');

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('not_installed');
        if (error.type === 'not_installed') {
          expect(error.message).toBe('agent-browser is not installed');
        }
      },
    );

    expect(mockExecuteCommand).toHaveBeenCalledWith('close', [], {
      sessionName: 'any-session',
    });
  });
});
