import { vi, describe, it, expect, beforeEach } from 'vitest';
import { okAsync } from 'neverthrow';
import { handleWait } from '../../commands/wait';
import type { WaitCommand } from '../../../types';
import type { ExecutionContext } from '../../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  browserWaitForMs: vi.fn(),
  browserWaitForSelector: vi.fn(),
  browserWaitForText: vi.fn(),
  browserWaitForLoad: vi.fn(),
  browserWaitForUrl: vi.fn(),
  browserWaitForFunction: vi.fn(),
  asSelector: vi.fn((v) => okAsync(v)),
  asJsExpression: vi.fn((v) => okAsync(v)),
  asUrl: vi.fn((v) => okAsync(v)),
}));

import {
  browserWaitForMs,
  browserWaitForSelector,
  browserWaitForText,
  browserWaitForLoad,
  browserWaitForUrl,
  browserWaitForFunction,
} from '@packages/agent-browser-adapter';

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
   * 前提条件: browserWaitForMs が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-1: waitコマンド（ms指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      ms: 1000,
    };

    vi.mocked(browserWaitForMs).mockReturnValue(okAsync({ success: true, data: {}, error: null }));

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(browserWaitForMs).toHaveBeenCalledWith(1000, mockContext.executeOptions);
  });

  /**
   * WAIT-2: wait コマンドが成功（selector指定）
   *
   * 前提条件: browserWaitForSelector が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-2: waitコマンド（selector指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      selector: '#loading-spinner',
    };

    vi.mocked(browserWaitForSelector).mockReturnValue(
      okAsync({ success: true, data: {}, error: null }),
    );

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(browserWaitForSelector).toHaveBeenCalledWith(
      '#loading-spinner',
      mockContext.executeOptions,
    );
  });

  /**
   * WAIT-3: wait コマンドが成功（text指定）
   *
   * 前提条件: browserWaitForText が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-3: waitコマンド（text指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      text: '読み込み完了',
    };

    vi.mocked(browserWaitForText).mockReturnValue(
      okAsync({ success: true, data: {}, error: null }),
    );

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(browserWaitForText).toHaveBeenCalledWith('読み込み完了', mockContext.executeOptions);
  });

  /**
   * WAIT-4: wait コマンドが成功（load指定）
   *
   * 前提条件: browserWaitForLoad が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-4: waitコマンド（load指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      load: 'networkidle',
    };

    vi.mocked(browserWaitForLoad).mockReturnValue(
      okAsync({ success: true, data: {}, error: null }),
    );

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(browserWaitForLoad).toHaveBeenCalledWith('networkidle', mockContext.executeOptions);
  });

  /**
   * WAIT-5: wait コマンドが成功（url指定）
   *
   * 前提条件: browserWaitForUrl が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-5: waitコマンド（url指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      url: '**/dashboard',
    };

    vi.mocked(browserWaitForUrl).mockReturnValue(okAsync({ success: true, data: {}, error: null }));

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(browserWaitForUrl).toHaveBeenCalledWith('**/dashboard', mockContext.executeOptions);
  });

  /**
   * WAIT-6: wait コマンドが成功（fn指定）
   *
   * 前提条件: browserWaitForFunction が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('WAIT-6: waitコマンド（fn指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      fn: 'window.appReady === true',
    };

    vi.mocked(browserWaitForFunction).mockReturnValue(
      okAsync({ success: true, data: {}, error: null }),
    );

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(browserWaitForFunction).toHaveBeenCalledWith(
      'window.appReady === true',
      mockContext.executeOptions,
    );
  });
});
