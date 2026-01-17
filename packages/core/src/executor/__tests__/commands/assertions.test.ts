import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok } from 'neverthrow';
import { handleAssertVisible, handleAssertChecked } from '../../commands/assertions';
import type { AssertVisibleCommand, AssertCheckedCommand } from '../../../types';
import type { ExecutionContext } from '../../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
}));

import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';

describe('handleAssertVisible', () => {
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
   * ASS-1: assertVisible が成功（要素が visible）
   *
   * 前提条件: is visible が { visible: true } を返す
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-1: 要素がvisibleの場合、成功を返す', async () => {
    // Arrange
    const command: AssertVisibleCommand = {
      command: 'assertVisible',
      selector: 'ログイン',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"visible":true},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { visible: true }, error: null }),
    );

    // Act
    const result = await handleAssertVisible(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * ASS-2: assertVisible が失敗（要素が invisible）
   *
   * 前提条件: is visible が { visible: false } を返す
   * 検証項目: err({ type: 'assertion_failed' }) が返される
   */
  it('ASS-2: 要素がinvisibleの場合、assertion_failedエラーを返す', async () => {
    // Arrange
    const command: AssertVisibleCommand = {
      command: 'assertVisible',
      selector: 'ログイン',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"visible":false},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { visible: false }, error: null }),
    );

    // Act
    const result = await handleAssertVisible(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('assertion_failed');
        if (error.type === 'assertion_failed') {
          expect(error.message).toContain('not visible');
        }
      },
    );
  });
});

describe('handleAssertChecked', () => {
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
   * ASS-3: assertChecked が成功（checked === true）
   *
   * 前提条件: is checked が { checked: true } を返す、command.checkedはデフォルト（true）
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-3: チェックボックスがcheckedの場合、成功を返す', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: '利用規約に同意',
    };

    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"checked":true},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { checked: true }, error: null }),
    );

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * ASS-4: assertChecked が成功（checked: false を期待）
   *
   * 前提条件: is checked が { checked: false } を返す、command.checked = false
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-4: checked: falseを期待する場合、正しく判定される', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: '利用規約に同意',
      checked: false,
    };

    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"checked":false},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { checked: false }, error: null }),
    );

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });
});
