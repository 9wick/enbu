import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { handleOpen } from '../../commands/navigation';
import type { OpenCommand } from '../../../types';
import type { ExecutionContext } from '../../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
}));

import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';

describe('handleOpen', () => {
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
   * NAV-1: open コマンドが成功
   *
   * 前提条件: agent-browser open が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('NAV-1: openコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: OpenCommand = {
      command: 'open',
      url: 'https://example.com',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"url":"https://example.com"},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { url: 'https://example.com' }, error: null }),
    );

    // Act
    const result = await handleOpen(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (commandResult) => {
        expect(commandResult.stdout).toContain('success');
        expect(commandResult.duration).toBeGreaterThanOrEqual(0);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'open',
      ['https://example.com', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * NAV-2: open コマンドが失敗
   *
   * 前提条件: agent-browser open が command_failed を返す
   * 検証項目: err(AgentBrowserError) が返される
   */
  it('NAV-2: openコマンドが失敗した場合、エラーを返す', async () => {
    // Arrange
    const command: OpenCommand = {
      command: 'open',
      url: 'https://invalid-url',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      err({
        type: 'command_failed',
        message: 'Invalid URL',
        command: 'open',
        args: ['https://invalid-url', '--json'],
        exitCode: 1,
        stderr: '',
        errorMessage: 'Invalid URL',
      }),
    );

    // Act
    const result = await handleOpen(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('command_failed');
      },
    );
  });
});
