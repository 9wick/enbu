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
   * 検証項目: ok(CommandResult) が返され、wait <ms> が実行される
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
   * WAIT-2: wait コマンドが成功（selector指定）
   *
   * 前提条件: agent-browser wait が成功、selector指定
   * 検証項目: ok(CommandResult) が返され、wait <selector> が実行される
   */
  it('WAIT-2: waitコマンド（selector指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      selector: '#loading-spinner',
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
      ['#loading-spinner', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * WAIT-3: wait コマンドが成功（text指定）
   *
   * 前提条件: agent-browser wait が成功、text指定
   * 検証項目: ok(CommandResult) が返され、wait --text <text> が実行される
   */
  it('WAIT-3: waitコマンド（text指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      text: '読み込み完了',
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
      ['--text', '読み込み完了', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * WAIT-4: wait コマンドが成功（load指定）
   *
   * 前提条件: agent-browser wait が成功、load指定
   * 検証項目: ok(CommandResult) が返され、wait --load <state> が実行される
   */
  it('WAIT-4: waitコマンド（load指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      load: 'networkidle',
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
      ['--load', 'networkidle', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * WAIT-5: wait コマンドが成功（url指定）
   *
   * 前提条件: agent-browser wait が成功、url指定
   * 検証項目: ok(CommandResult) が返され、wait --url <pattern> が実行される
   */
  it('WAIT-5: waitコマンド（url指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      url: '**/dashboard',
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
      ['--url', '**/dashboard', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * WAIT-6: wait コマンドが成功（fn指定）
   *
   * 前提条件: agent-browser wait が成功、fn指定
   * 検証項目: ok(CommandResult) が返され、wait --fn <expression> が実行される
   */
  it('WAIT-6: waitコマンド（fn指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      fn: 'window.appReady === true',
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
      ['--fn', 'window.appReady === true', '--json'],
      mockContext.executeOptions,
    );
  });
});
