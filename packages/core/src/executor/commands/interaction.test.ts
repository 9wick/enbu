import type { CssSelector, KeyboardKey } from '@packages/agent-browser-adapter';
import { errAsync, ok, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClickCommand, FillCommand, PressCommand, TypeCommand } from '../../types';
import type { ExecutionContext } from '../result';
import { handleClick, handleFill, handlePress, handleType } from './interaction';

// テスト用: 文字列をBranded Typeに変換（テストではキャストで対応）
const toCssSelector = (s: string) => s as CssSelector;
const toKeyboardKey = (s: string) => s as KeyboardKey;

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  browserClick: vi.fn(),
  browserType: vi.fn(),
  browserFill: vi.fn(),
  browserPress: vi.fn(),
  asCssSelector: vi.fn((v) => ok(v)),
  asKeyboardKey: vi.fn((v) => ok(v)),
}));

import {
  browserClick,
  browserFill,
  browserPress,
  browserType,
} from '@packages/agent-browser-adapter';

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
      cwd: '/tmp',
    },
    env: {},
    autoWaitTimeoutMs: 30000,
    autoWaitIntervalMs: 100,
    resolvedRefState: { status: 'notApplied' },
  };

  /**
   * INT-1: click コマンドが成功
   *
   * 前提条件: browserClick が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('INT-1: clickコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: ClickCommand = {
      command: 'click',
      css: toCssSelector('ログインボタン'),
    };

    vi.mocked(browserClick).mockReturnValue(okAsync({ success: true, data: {}, error: null }));

    // Act
    const result = await handleClick(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (commandResult) => {
        expect(commandResult.duration).toBeGreaterThanOrEqual(0);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * INT-2: click コマンドが失敗
   *
   * 前提条件: browserClick が command_failed を返す
   * 検証項目: err(AgentBrowserError) が返される
   */
  it('INT-2: clickコマンドが失敗した場合、エラーを返す', async () => {
    // Arrange
    const command: ClickCommand = {
      command: 'click',
      css: toCssSelector('存在しないボタン'),
    };

    vi.mocked(browserClick).mockReturnValue(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'click',
        args: [],
        exitCode: 1,
        stderr: '',
        rawError: 'Element not found',
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
      cwd: '/tmp',
    },
    env: {},
    autoWaitTimeoutMs: 30000,
    autoWaitIntervalMs: 100,
    resolvedRefState: { status: 'notApplied' },
  };

  /**
   * INT-3: type コマンドが成功
   *
   * 前提条件: browserType が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('INT-3: typeコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: TypeCommand = {
      command: 'type',
      css: toCssSelector('ユーザー名入力欄'),
      value: 'テストユーザー',
    };

    vi.mocked(browserType).mockReturnValue(okAsync({ success: true, data: {}, error: null }));

    // Act
    const result = await handleType(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
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
      cwd: '/tmp',
    },
    env: {},
    autoWaitTimeoutMs: 30000,
    autoWaitIntervalMs: 100,
    resolvedRefState: { status: 'notApplied' },
  };

  /**
   * INT-4: fill コマンドが成功
   *
   * 前提条件: browserFill が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('INT-4: fillコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: FillCommand = {
      command: 'fill',
      css: toCssSelector('メールアドレス'),
      value: 'test@example.com',
    };

    vi.mocked(browserFill).mockReturnValue(okAsync({ success: true, data: {}, error: null }));

    // Act
    const result = await handleFill(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
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
      cwd: '/tmp',
    },
    env: {},
    autoWaitTimeoutMs: 30000,
    autoWaitIntervalMs: 100,
    resolvedRefState: { status: 'notApplied' },
  };

  /**
   * INT-5: press コマンドが成功
   *
   * 前提条件: browserPress が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('INT-5: pressコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: PressCommand = {
      command: 'press',
      key: toKeyboardKey('Enter'),
    };

    vi.mocked(browserPress).mockReturnValue(okAsync({ success: true, data: {}, error: null }));

    // Act
    const result = await handlePress(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });
});
