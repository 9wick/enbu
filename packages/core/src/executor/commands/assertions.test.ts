import type { Selector } from '@packages/agent-browser-adapter';
import { errAsync, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AssertCheckedCommand,
  AssertNotVisibleCommand,
  AssertVisibleCommand,
} from '../../types';
import { UseDefault } from '../../types/utility-types';
import type { ExecutionContext } from '../result';
import { handleAssertChecked, handleAssertNotVisible, handleAssertVisible } from './assertions';

// テスト用: 文字列をBranded Typeに変換（テストではキャストで対応）
const toSelector = (s: string) => s as Selector;

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  browserIsVisible: vi.fn(),
  browserIsChecked: vi.fn(),
  browserWaitForSelector: vi.fn(),
  browserWaitForText: vi.fn(),
  browserWaitForNetworkIdle: vi.fn(),
  asSelector: vi.fn((v) => {
    const { okAsync } = require('neverthrow');
    return okAsync(v);
  }),
}));

import {
  browserIsChecked,
  browserIsVisible,
  browserWaitForNetworkIdle,
  browserWaitForText,
} from '@packages/agent-browser-adapter';

describe('handleAssertVisible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // waitForElement用のデフォルトモック
    vi.mocked(browserWaitForText).mockReturnValue(okAsync({}));
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
   * ASS-1: assertVisible が成功（要素が visible）
   *
   * 前提条件: browserIsVisible が { visible: true } を返す
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-1: 要素がvisibleの場合、成功を返す', async () => {
    // Arrange
    const command: AssertVisibleCommand = {
      command: 'assertVisible',
      selector: toSelector('ログイン'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(okAsync({ visible: true }));

    // Act
    const result = await handleAssertVisible(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * ASS-2: assertVisible が失敗（要素が invisible）
   *
   * 前提条件: browserIsVisible が { visible: false } を返す
   * 検証項目: err({ type: 'assertion_failed' }) が返される
   */
  it('ASS-2: 要素がinvisibleの場合、assertion_failedエラーを返す', async () => {
    // Arrange
    const command: AssertVisibleCommand = {
      command: 'assertVisible',
      selector: toSelector('ログイン'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(okAsync({ visible: false }));

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

  /**
   * ASS-3: assertVisible がコマンド実行失敗
   *
   * 前提条件: browserIsVisible が command_failed エラーを返す（要素が見つからない等）
   * 検証項目: err({ type: 'command_failed' }) が返される
   */
  it('ASS-3: コマンド実行失敗の場合、command_failedエラーを返す', async () => {
    // Arrange
    const command: AssertVisibleCommand = {
      command: 'assertVisible',
      selector: toSelector('存在しない要素'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'is',
        args: [],
        exitCode: 1,
        stderr: '',
        rawError: 'Element not found',
      }),
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
        expect(error.type).toBe('command_failed');
        if (error.type === 'command_failed') {
          expect(error.message).toContain('Element not found');
        }
      },
    );
  });

  /**
   * ASS-4: assertVisible がデータ不正（visible フィールドが存在しない）
   *
   * 前提条件: browserIsVisible が agent_browser_output_parse_error を返す
   * 検証項目: err({ type: 'agent_browser_output_parse_error' }) が返される
   */
  it('ASS-4: データ構造が不正な場合、パースエラーを返す', async () => {
    // Arrange
    const command: AssertVisibleCommand = {
      command: 'assertVisible',
      selector: toSelector('ログイン'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(
      errAsync({
        type: 'agent_browser_output_parse_error',
        message: 'Invalid response data',
        command: 'is',
        issues: [],
        rawOutput: '{"invalid":"field"}',
      }),
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
        expect(error.type).toBe('agent_browser_output_parse_error');
      },
    );
  });
});

describe('handleAssertNotVisible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // waitForPageStable用のデフォルトモック
    vi.mocked(browserWaitForNetworkIdle).mockReturnValue(okAsync({}));
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
   * ASS-NV-1: assertNotVisible が成功（要素が invisible）
   *
   * 前提条件: browserIsVisible が { visible: false } を返す
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-NV-1: 要素がinvisibleの場合、成功を返す', async () => {
    // Arrange
    const command: AssertNotVisibleCommand = {
      command: 'assertNotVisible',
      selector: toSelector('エラーメッセージ'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(okAsync({ visible: false }));

    // Act
    const result = await handleAssertNotVisible(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * ASS-NV-2: assertNotVisible が失敗（要素が visible）
   *
   * 前提条件: browserIsVisible が { visible: true } を返す
   * 検証項目: err({ type: 'assertion_failed' }) が返される
   */
  it('ASS-NV-2: 要素がvisibleの場合、assertion_failedエラーを返す', async () => {
    // Arrange
    const command: AssertNotVisibleCommand = {
      command: 'assertNotVisible',
      selector: toSelector('エラーメッセージ'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(okAsync({ visible: true }));

    // Act
    const result = await handleAssertNotVisible(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('assertion_failed');
        if (error.type === 'assertion_failed') {
          expect(error.message).toContain('is visible');
        }
      },
    );
  });

  /**
   * ASS-NV-3: assertNotVisible がコマンド実行失敗
   *
   * 前提条件: browserIsVisible が command_failed エラーを返す（要素が見つからない等）
   * 検証項目: err({ type: 'command_failed' }) が返される
   */
  it('ASS-NV-3: コマンド実行失敗の場合、command_failedエラーを返す', async () => {
    // Arrange
    const command: AssertNotVisibleCommand = {
      command: 'assertNotVisible',
      selector: toSelector('存在しない要素'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'is',
        args: [],
        exitCode: 1,
        stderr: '',
        rawError: 'Element not found',
      }),
    );

    // Act
    const result = await handleAssertNotVisible(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('command_failed');
        if (error.type === 'command_failed') {
          expect(error.message).toContain('Element not found');
        }
      },
    );
  });

  /**
   * ASS-NV-4: assertNotVisible がデータ不正（visible フィールドが存在しない）
   *
   * 前提条件: browserIsVisible が agent_browser_output_parse_error を返す
   * 検証項目: err({ type: 'agent_browser_output_parse_error' }) が返される
   */
  it('ASS-NV-4: データ構造が不正な場合、パースエラーを返す', async () => {
    // Arrange
    const command: AssertNotVisibleCommand = {
      command: 'assertNotVisible',
      selector: toSelector('エラーメッセージ'),
    };

    vi.mocked(browserIsVisible).mockReturnValue(
      errAsync({
        type: 'agent_browser_output_parse_error',
        message: 'Invalid response data',
        command: 'is',
        issues: [],
        rawOutput: '{"invalid":"field"}',
      }),
    );

    // Act
    const result = await handleAssertNotVisible(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('agent_browser_output_parse_error');
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
      cwd: '/tmp',
    },
    env: {},
    autoWaitTimeoutMs: 30000,
    autoWaitIntervalMs: 100,
    resolvedRefState: { status: 'notApplied' },
  };

  /**
   * ASS-3: assertChecked が成功（checked === true）
   *
   * 前提条件: browserIsChecked が { checked: true } を返す、command.checkedはデフォルト（true）
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-3: チェックボックスがcheckedの場合、成功を返す', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: toSelector('利用規約に同意'),
      checked: UseDefault,
    };

    vi.mocked(browserIsChecked).mockReturnValue(okAsync({ checked: true }));

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * ASS-4: assertChecked が成功（checked: false を期待）
   *
   * 前提条件: browserIsChecked が { checked: false } を返す、command.checked = false
   * 検証項目: ok(CommandResult) が返される
   */
  it('ASS-4: checked: falseを期待する場合、正しく判定される', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: toSelector('利用規約に同意'),
      checked: false,
    };

    vi.mocked(browserIsChecked).mockReturnValue(okAsync({ checked: false }));

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * ASS-5: assertChecked が失敗（checked状態が期待と異なる）
   *
   * 前提条件: browserIsChecked が { checked: false } を返すが、command.checked = true（デフォルト）
   * 検証項目: err({ type: 'assertion_failed' }) が返される
   */
  it('ASS-5: checked状態が期待と異なる場合、assertion_failedエラーを返す', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: toSelector('利用規約に同意'),
      checked: UseDefault,
    };

    vi.mocked(browserIsChecked).mockReturnValue(okAsync({ checked: false }));

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('assertion_failed');
        if (error.type === 'assertion_failed') {
          expect(error.message).toContain('checked state');
        }
      },
    );
  });

  /**
   * ASS-6: assertChecked がコマンド実行失敗
   *
   * 前提条件: browserIsChecked が command_failed エラーを返す（要素が見つからない等）
   * 検証項目: err({ type: 'command_failed' }) が返される
   */
  it('ASS-6: コマンド実行失敗の場合、command_failedエラーを返す', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: toSelector('存在しない要素'),
      checked: UseDefault,
    };

    vi.mocked(browserIsChecked).mockReturnValue(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'is',
        args: [],
        exitCode: 1,
        stderr: '',
        rawError: 'Element not found',
      }),
    );

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('command_failed');
        if (error.type === 'command_failed') {
          expect(error.message).toContain('Element not found');
        }
      },
    );
  });

  /**
   * ASS-7: assertChecked がデータ不正（checked フィールドが存在しない）
   *
   * 前提条件: browserIsChecked が agent_browser_output_parse_error を返す
   * 検証項目: err({ type: 'agent_browser_output_parse_error' }) が返される
   */
  it('ASS-7: データ構造が不正な場合、パースエラーを返す', async () => {
    // Arrange
    const command: AssertCheckedCommand = {
      command: 'assertChecked',
      selector: toSelector('利用規約に同意'),
      checked: UseDefault,
    };

    vi.mocked(browserIsChecked).mockReturnValue(
      errAsync({
        type: 'agent_browser_output_parse_error',
        message: 'Invalid response data',
        command: 'is',
        issues: [],
        rawOutput: '{"invalid":"field"}',
      }),
    );

    // Act
    const result = await handleAssertChecked(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('agent_browser_output_parse_error');
      },
    );
  });
});
