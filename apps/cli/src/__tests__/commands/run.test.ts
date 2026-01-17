import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFlowCommand } from '../../commands/run';
import { OutputFormatter } from '../../output/formatter';
import { checkAgentBrowser } from '@packages/agent-browser-adapter';
import { executeFlow, parseFlowYaml } from '@packages/core';
import { ok, err } from 'neverthrow';
import type { Flow, FlowResult } from '@packages/core';

// 依存をモック
vi.mock('@packages/agent-browser-adapter');
vi.mock('@packages/core');

// glob をモック
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

// fs/promises をモック
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('runFlowCommand', () => {
  let formatter: OutputFormatter;

  beforeEach(() => {
    vi.clearAllMocks();

    // フォーマッターのモック（出力を抑制）
    formatter = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
      failure: vi.fn(),
      indent: vi.fn(),
      newline: vi.fn(),
      separator: vi.fn(),
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
    } as unknown as OutputFormatter;

    // デフォルトのモック動作
    vi.mocked(checkAgentBrowser).mockResolvedValue(ok('agent-browser is installed') as never);
  });

  /**
   * R-1: agent-browser未インストール
   *
   * 前提条件: checkAgentBrowser がエラーを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('R-1: agent-browserが未インストールの場合、エラーを返す', async () => {
    // Arrange
    vi.mocked(checkAgentBrowser).mockResolvedValue(
      err({
        type: 'not_installed',
        message: 'agent-browser is not installed',
      }) as never,
    );

    // Act
    const result = await runFlowCommand(
      {
        files: [],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        bail: false,
        verbose: false,
      },
      formatter,
    );

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('execution_error');
      },
    );
  });

  /**
   * R-2: フローファイルが見つからない
   *
   * 前提条件: ファイルパスが空、.abflow/ も存在しない
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('R-2: フローファイルが見つからない場合、エラーを返す', async () => {
    // Arrange
    const { glob } = await import('glob');
    vi.mocked(glob).mockResolvedValue([] as never);

    // Act
    const result = await runFlowCommand(
      {
        files: [],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        bail: false,
        verbose: false,
      },
      formatter,
    );

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('execution_error');
        expect(error.message).toContain('No flow files found');
      },
    );
  });

  /**
   * R-3: フロー読み込み成功、実行成功
   *
   * 前提条件: loadFlows が1つのフローを返す、executeFlow が成功
   * 検証項目: ok({ passed: 1, failed: 0, total: 1 }) が返される
   */
  it('R-3: フロー実行が成功する', async () => {
    // Arrange
    const mockFlow: Flow = {
      name: 'ログイン',
      steps: [{ command: 'open', url: 'https://example.com' }],
      env: {},
    };

    const mockFlowResult: FlowResult = {
      flow: mockFlow,
      status: 'passed',
      duration: 1500,
      steps: [
        {
          index: 0,
          command: mockFlow.steps[0],
          status: 'passed',
          duration: 1500,
        },
      ],
    };

    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue(
      `name: ログイン\ndescription: ログインフロー\nsteps:\n  - command: open\n    url: https://example.com` as never,
    );

    vi.mocked(parseFlowYaml).mockReturnValue(ok(mockFlow) as never);
    vi.mocked(executeFlow).mockResolvedValue(ok(mockFlowResult) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['login.flow.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        bail: false,
        verbose: false,
      },
      formatter,
    );

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (executionResult) => {
        expect(executionResult.passed).toBe(1);
        expect(executionResult.failed).toBe(0);
        expect(executionResult.total).toBe(1);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * R-4: フロー実行失敗
   *
   * 前提条件: executeFlow が失敗を返す
   * 検証項目: ok({ passed: 0, failed: 1, total: 1 }) が返される
   */
  it('R-4: フロー実行が失敗する', async () => {
    // Arrange
    const mockFlow: Flow = {
      name: 'ログイン',
      steps: [{ command: 'click', selector: 'NotExist' }],
      env: {},
    };

    const mockFlowResult: FlowResult = {
      flow: mockFlow,
      status: 'failed',
      duration: 2000,
      steps: [
        {
          index: 0,
          command: mockFlow.steps[0],
          status: 'failed',
          duration: 2000,
          error: {
            message: 'Element not found',
            type: 'command_failed',
          },
        },
      ],
      error: {
        message: 'Element not found',
        stepIndex: 0,
      },
    };

    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue(
      `name: ログイン\ndescription: ログインフロー\nsteps:\n  - command: click\n    selector: NotExist` as never,
    );

    vi.mocked(parseFlowYaml).mockReturnValue(ok(mockFlow) as never);
    vi.mocked(executeFlow).mockResolvedValue(ok(mockFlowResult) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['login.flow.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        bail: false,
        verbose: false,
      },
      formatter,
    );

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (executionResult) => {
        expect(executionResult.passed).toBe(0);
        expect(executionResult.failed).toBe(1);
        expect(executionResult.total).toBe(1);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * R-5: 複数フロー実行、一部失敗
   *
   * 前提条件: 2つのフローを実行、1つ成功、1つ失敗
   * 検証項目: ok({ passed: 1, failed: 1, total: 2 }) が返される
   */
  it('R-5: 複数フローを実行し、一部が失敗する', async () => {
    // Arrange
    const mockFlow1: Flow = {
      name: 'フロー1',
      steps: [{ command: 'open', url: 'https://example.com' }],
      env: {},
    };

    const mockFlow2: Flow = {
      name: 'フロー2',
      steps: [{ command: 'click', selector: 'NotExist' }],
      env: {},
    };

    const mockFlowResult1: FlowResult = {
      flow: mockFlow1,
      status: 'passed',
      duration: 1500,
      steps: [
        {
          index: 0,
          command: mockFlow1.steps[0],
          status: 'passed',
          duration: 1500,
        },
      ],
    };

    const mockFlowResult2: FlowResult = {
      flow: mockFlow2,
      status: 'failed',
      duration: 2000,
      steps: [
        {
          index: 0,
          command: mockFlow2.steps[0],
          status: 'failed',
          duration: 2000,
          error: {
            message: 'Element not found',
            type: 'command_failed',
          },
        },
      ],
      error: {
        message: 'Element not found',
        stepIndex: 0,
      },
    };

    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile)
      .mockResolvedValueOnce(
        `name: フロー1\ndescription: 成功するフロー\nsteps:\n  - command: open\n    url: https://example.com` as never,
      )
      .mockResolvedValueOnce(
        `name: フロー2\ndescription: 失敗するフロー\nsteps:\n  - command: click\n    selector: NotExist` as never,
      );

    vi.mocked(parseFlowYaml)
      .mockReturnValueOnce(ok(mockFlow1) as never)
      .mockReturnValueOnce(ok(mockFlow2) as never);
    vi.mocked(executeFlow)
      .mockResolvedValueOnce(ok(mockFlowResult1) as never)
      .mockResolvedValueOnce(ok(mockFlowResult2) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['flow1.flow.yaml', 'flow2.flow.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        bail: false,
        verbose: false,
      },
      formatter,
    );

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (executionResult) => {
        expect(executionResult.passed).toBe(1);
        expect(executionResult.failed).toBe(1);
        expect(executionResult.total).toBe(2);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * R-6: --bail で最初の失敗で中断
   *
   * 前提条件: bail=true, 最初のフローが失敗
   * 検証項目: 2つ目のフローは実行されず、ok({ passed: 0, failed: 1, total: 1 }) が返される
   */
  it('R-6: --bailフラグで最初の失敗時に中断する', async () => {
    // Arrange
    const mockFlow1: Flow = {
      name: 'フロー1',
      steps: [{ command: 'click', selector: 'NotExist' }],
      env: {},
    };

    const mockFlowResult1: FlowResult = {
      flow: mockFlow1,
      status: 'failed',
      duration: 2000,
      steps: [
        {
          index: 0,
          command: mockFlow1.steps[0],
          status: 'failed',
          duration: 2000,
          error: {
            message: 'Element not found',
            type: 'command_failed',
          },
        },
      ],
      error: {
        message: 'Element not found',
        stepIndex: 0,
      },
    };

    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValueOnce(
      `name: フロー1\ndescription: 失敗するフロー\nsteps:\n  - command: click\n    selector: NotExist` as never,
    );

    vi.mocked(parseFlowYaml).mockReturnValueOnce(ok(mockFlow1) as never);
    vi.mocked(executeFlow).mockResolvedValueOnce(ok(mockFlowResult1) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['flow1.flow.yaml', 'flow2.flow.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        bail: true, // bail フラグ
        verbose: false,
      },
      formatter,
    );

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (executionResult) => {
        expect(executionResult.passed).toBe(0);
        expect(executionResult.failed).toBe(1);
        // 2つ目は実行されない（totalは1）
        expect(executionResult.total).toBe(1);
        // executeFlowは1回のみ呼ばれる
        expect(vi.mocked(executeFlow)).toHaveBeenCalledTimes(1);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });
});
