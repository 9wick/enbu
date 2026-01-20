import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFlowCommand } from '../../commands/run';
import { OutputFormatter } from '../../output/formatter';
import { checkAgentBrowser, browserClose } from '@packages/agent-browser-adapter';
import { executeFlow, parseFlowYaml } from '@packages/core';
import { ok, okAsync, errAsync } from 'neverthrow';
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
    vi.mocked(checkAgentBrowser).mockReturnValue(okAsync('agent-browser is installed') as never);
    vi.mocked(browserClose).mockReturnValue(okAsync(undefined) as never);
  });

  /**
   * R-1: agent-browser未インストール
   *
   * 前提条件: checkAgentBrowser がエラーを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('R-1: agent-browserが未インストールの場合、エラーを返す', async () => {
    // Arrange
    vi.mocked(checkAgentBrowser).mockReturnValue(
      errAsync({
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
        verbose: false,
        progressJson: false,
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
        verbose: false,
        progressJson: false,
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
      sessionName: 'test-session',
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
    vi.mocked(executeFlow).mockReturnValue(okAsync(mockFlowResult) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['login.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
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
      sessionName: 'test-session',
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
    vi.mocked(executeFlow).mockReturnValue(okAsync(mockFlowResult) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['login.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
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
      sessionName: 'test-session',
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
      sessionName: 'test-session',
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
      .mockReturnValueOnce(okAsync(mockFlowResult1) as never)
      .mockReturnValueOnce(okAsync(mockFlowResult2) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['flow1.enbu.yaml', 'flow2.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
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
   * R-6: 複数フローは独立して動作する（1つ失敗しても他は実行）
   *
   * 仕様: 複数ファイルは独立して動くべき
   *
   * 前提条件: 2つのフロー、1つ目が失敗、2つ目が成功
   * 検証項目:
   *   - 1つ目が失敗しても2つ目は実行される
   *   - ok({ passed: 1, failed: 1, total: 2 }) が返される
   */
  it('R-6: 複数フローは独立して動作する（1つ失敗しても他は実行）', async () => {
    // Arrange
    const mockFlow1: Flow = {
      name: 'フロー1',
      steps: [{ command: 'click', selector: 'NotExist' }],
      env: {},
    };

    const mockFlow2: Flow = {
      name: 'フロー2',
      steps: [{ command: 'open', url: 'https://example.com' }],
      env: {},
    };

    const mockFlowResult1: FlowResult = {
      flow: mockFlow1,
      sessionName: 'test-session-1',
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

    const mockFlowResult2: FlowResult = {
      flow: mockFlow2,
      sessionName: 'test-session-2',
      status: 'passed',
      duration: 1000,
      steps: [
        {
          index: 0,
          command: mockFlow2.steps[0],
          status: 'passed',
          duration: 1000,
        },
      ],
    };

    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile)
      .mockResolvedValueOnce(
        `name: フロー1\nsteps:\n  - command: click\n    selector: NotExist` as never,
      )
      .mockResolvedValueOnce(
        `name: フロー2\nsteps:\n  - command: open\n    url: https://example.com` as never,
      );

    vi.mocked(parseFlowYaml)
      .mockReturnValueOnce(ok(mockFlow1) as never)
      .mockReturnValueOnce(ok(mockFlow2) as never);
    vi.mocked(executeFlow)
      .mockReturnValueOnce(okAsync(mockFlowResult1) as never)
      .mockReturnValueOnce(okAsync(mockFlowResult2) as never);

    // Act
    const result = await runFlowCommand(
      {
        files: ['flow1.enbu.yaml', 'flow2.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
      },
      formatter,
    );

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (executionResult) => {
        // 1つ目は失敗、2つ目は成功
        expect(executionResult.passed).toBe(1);
        expect(executionResult.failed).toBe(1);
        // 両方実行されている（totalは2）
        expect(executionResult.total).toBe(2);
        // executeFlowは2回呼ばれる
        expect(vi.mocked(executeFlow)).toHaveBeenCalledTimes(2);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * R-7: 正常終了時にcloseSessionが呼ばれる
   *
   * 前提条件: フローが正常に実行される（status: 'passed'）
   * 検証項目: closeSessionが正しいsessionNameで呼び出されること
   */
  it('R-7: 正常終了時にcloseSessionが呼ばれる', async () => {
    // Arrange
    const mockFlow: Flow = {
      name: 'ログイン',
      steps: [{ command: 'open', url: 'https://example.com' }],
      env: {},
    };

    const mockFlowResult: FlowResult = {
      flow: mockFlow,
      sessionName: 'test-session-123',
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
    vi.mocked(executeFlow).mockReturnValue(okAsync(mockFlowResult) as never);

    // Act
    await runFlowCommand(
      {
        files: ['login.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
      },
      formatter,
    );

    // Assert
    // browserCloseが呼び出されたことを確認
    // sessionNameは動的に生成されるため、パターンマッチで確認
    expect(vi.mocked(browserClose)).toHaveBeenCalledTimes(1);
    const sessionName = vi.mocked(browserClose).mock.calls[0][0];
    expect(sessionName).toMatch(/^abf-ログイン-\d+$/)
  });

  /**
   * R-8: 失敗終了時にデバッグ案内が表示される
   *
   * 前提条件: フローが失敗する（status: 'failed'）
   * 検証項目:
   * - closeSessionが呼ばれないこと
   * - formatter.infoが「💡 Debug:」で呼ばれること
   * - formatter.indentが「npx agent-browser snapshot --session xxx」で呼ばれること
   */
  it('R-8: 失敗終了時にデバッグ案内が表示される', async () => {
    // Arrange
    const mockFlow: Flow = {
      name: 'ログイン',
      steps: [{ command: 'click', selector: 'NotExist' }],
      env: {},
    };

    const mockFlowResult: FlowResult = {
      flow: mockFlow,
      sessionName: 'test-session-456',
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
    vi.mocked(executeFlow).mockReturnValue(okAsync(mockFlowResult) as never);

    // Act
    await runFlowCommand(
      {
        files: ['login.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
      },
      formatter,
    );

    // Assert
    // browserCloseが呼ばれないことを確認
    expect(vi.mocked(browserClose)).not.toHaveBeenCalled();

    // デバッグ案内が表示されることを確認
    expect(vi.mocked(formatter.info)).toHaveBeenCalledWith(
      '💡 Debug: To inspect the browser state, run:',
    );
    // sessionNameは動的に生成されるため、パターンマッチで確認
    // 形式: enbu-<name最大12文字>-<36進数タイムスタンプ>
    const indentCalls = vi.mocked(formatter.indent).mock.calls;
    const debugCommand = indentCalls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].startsWith('npx agent-browser snapshot --session enbu-ログイン-') &&
        call[1] === 1,
    );
    expect(debugCommand).toBeDefined();
  });

  /**
   * R-9: 異常終了時（エラー）にデバッグ案内が表示されない
   *
   * 前提条件: executeFlowがerrを返す（初期化エラーなど）
   * 検証項目:
   * - closeSessionが呼ばれないこと
   * - デバッグ案内が表示されないこと（セッションが作成されていない可能性があるため）
   */
  it('R-9: 異常終了時（エラー）にデバッグ案内が表示されない', async () => {
    // Arrange
    const mockFlow: Flow = {
      name: 'ログイン',
      steps: [{ command: 'open', url: 'https://example.com' }],
      env: {},
    };

    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue(
      `name: ログイン\ndescription: ログインフロー\nsteps:\n  - command: open\n    url: https://example.com` as never,
    );

    vi.mocked(parseFlowYaml).mockReturnValue(ok(mockFlow) as never);
    // executeFlowがエラーを返すようにモック（初期化エラーなど）
    vi.mocked(executeFlow).mockReturnValue(
      errAsync({
        type: 'command_failed',
        command: 'open',
        exitCode: 1,
        stdout: '',
        stderr: 'Browser launch failed',
        errorMessage: 'Browser launch failed',
      }) as never,
    );

    // Act
    await runFlowCommand(
      {
        files: ['login.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: false,
        progressJson: false,
      },
      formatter,
    );

    // Assert
    // browserCloseが呼ばれないことを確認
    expect(vi.mocked(browserClose)).not.toHaveBeenCalled();

    // executeFlowがerrを返した場合、セッションが作成されていない可能性があるため
    // デバッグ案内は表示されないことを確認
    const infoCalls = vi.mocked(formatter.info).mock.calls;
    const debugInfo = infoCalls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('💡 Debug:'),
    );
    expect(debugInfo).toBeUndefined();
  });
});
