import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { handleClick, handleType, handleFill, handlePress } from '../../commands/interaction';
import type { ClickCommand, TypeCommand, FillCommand, PressCommand } from '../../../types';
import type { ExecutionContext } from '../../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
}));

import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';

describe('handleClick', () => {
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
   * INT-1: click コマンドが成功
   *
   * 前提条件: agent-browser click が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('INT-1: clickコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: ClickCommand = {
      command: 'click',
      selector: 'ログインボタン',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"clicked":true},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { clicked: true }, error: null }),
    );

    // Act
    const result = await handleClick(command, mockContext);

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
      'click',
      ['ログインボタン', '--json'],
      mockContext.executeOptions,
    );
  });

  /**
   * INT-2: click コマンドが失敗
   *
   * 前提条件: agent-browser click が command_failed を返す
   * 検証項目: err(AgentBrowserError) が返される
   */
  it('INT-2: clickコマンドが失敗した場合、エラーを返す', async () => {
    // Arrange
    const command: ClickCommand = {
      command: 'click',
      selector: '存在しないボタン',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      err({
        type: 'command_failed',
        message: 'Element not found',
        command: 'click',
        args: ['存在しないボタン', '--json'],
        exitCode: 1,
        stderr: '',
        errorMessage: 'Element not found',
      }),
    );

    // Act
    const result = await handleClick(command, mockContext);

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

describe('handleType', () => {
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
   * INT-3: type コマンドが成功
   *
   * 前提条件: agent-browser type が成功
   * 検証項目: ok(CommandResult) が返される、valueフィールドが正しく渡される
   */
  it('INT-3: typeコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: TypeCommand = {
      command: 'type',
      selector: 'ユーザー名入力欄',
      value: 'テストユーザー',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handleType(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'type',
      ['ユーザー名入力欄', 'テストユーザー', '--json'],
      mockContext.executeOptions,
    );
  });
});

describe('handleFill', () => {
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
   * INT-4: fill コマンドが成功
   *
   * 前提条件: agent-browser fill が成功
   * 検証項目: ok(CommandResult) が返される、valueフィールドが正しく渡される
   */
  it('INT-4: fillコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: FillCommand = {
      command: 'fill',
      selector: 'メールアドレス',
      value: 'test@example.com',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handleFill(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'fill',
      ['メールアドレス', 'test@example.com', '--json'],
      mockContext.executeOptions,
    );
  });
});

describe('handlePress', () => {
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
   * INT-5: press コマンドが成功
   *
   * 前提条件: agent-browser press が成功
   * 検証項目: ok(CommandResult) が返される、keyフィールドが正しく渡される
   */
  it('INT-5: pressコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: PressCommand = {
      command: 'press',
      key: 'Enter',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handlePress(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'press',
      ['Enter', '--json'],
      mockContext.executeOptions,
    );
  });
});
