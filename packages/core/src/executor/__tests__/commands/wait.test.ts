import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok } from 'neverthrow';
import { handleWait } from '../../commands/wait';
import type { WaitCommand } from '../../../types';
import type { ExecutionContext } from '../../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
}));

import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';

describe('handleWait', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContext: ExecutionContext = {
    sessionName: 'test',
    executeOptions: {
      sessionName: 'test',
      headed: false,
      timeoutMs: 30000,
    },
    env: {},
    autoWaitTimeoutMs: 30000,
    autoWaitIntervalMs: 100,
  };

  /**
   * WAIT-1: wait コマンドが成功（ms指定）
   *
   * 前提条件: agent-browser wait が成功、ms指定
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-1: waitコマンド（ms指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      ms: 1000,
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'wait',
      ['1000', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * WAIT-2: wait コマンドが成功（target指定）
   *
   * 前提条件: agent-browser wait が成功、target指定
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-2: waitコマンド（target指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      target: 'ログイン',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'wait',
      ['ログイン', '--json'],
      mockContext.executeOptions,
    );
  });
});
