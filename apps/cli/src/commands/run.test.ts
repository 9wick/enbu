import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFlowCommand } from './run';
import { OutputFormatter } from '../output/formatter';
import { runFlows } from '@packages/core';
import type { RunFlowsOutput, OrchestratorError } from '@packages/core';
import { okAsync, errAsync } from 'neverthrow';

// 依存をモック
vi.mock('@packages/core', () => ({
  runFlows: vi.fn(),
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
  });

  /**
   * R-1: agent-browser未インストール
   *
   * 前提条件: runFlows がenvironment_errorを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('R-1: agent-browserが未インストールの場合、エラーを返す', async () => {
    // Arrange
    const error: OrchestratorError = {
      type: 'environment_error',
      message: 'agent-browser is not installed',
    };
    vi.mocked(runFlows).mockReturnValue(errAsync(error));

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
      (cliError) => {
        expect(cliError.type).toBe('execution_error');
        expect(cliError.message).toBe('agent-browser is not installed');
      },
    );
  });

  /**
   * R-2: フローファイルが見つからない
   *
   * 前提条件: runFlows がno_flows_foundエラーを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('R-2: フローファイルが見つからない場合、エラーを返す', async () => {
    // Arrange
    const error: OrchestratorError = {
      type: 'no_flows_found',
      message: 'No flow files found',
    };
    vi.mocked(runFlows).mockReturnValue(errAsync(error));

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
      (cliError) => {
        expect(cliError.type).toBe('execution_error');
        expect(cliError.message).toContain('No flow files found');
      },
    );
  });

  /**
   * R-3: フロー読み込み成功、実行成功
   *
   * 前提条件: runFlows が成功結果を返す
   * 検証項目: ok({ passed: 1, failed: 0, total: 1 }) が返される
   */
  it('R-3: フロー実行が成功する', async () => {
    // Arrange
    const mockOutput: RunFlowsOutput = {
      passed: 1,
      failed: 0,
      total: 1,
      duration: 1500,
      flows: [
        {
          flowName: 'ログイン',
          status: 'passed',
          duration: 1500,
          steps: [
            {
              index: 0,
              command: { command: 'open', url: 'https://example.com' as never },
              status: 'passed',
              duration: 1500,
              stdout: '',
            },
          ],
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

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
   * 前提条件: runFlows が失敗結果を返す
   * 検証項目: ok({ passed: 0, failed: 1, total: 1 }) が返される
   */
  it('R-4: フロー実行が失敗する', async () => {
    // Arrange
    const mockOutput: RunFlowsOutput = {
      passed: 0,
      failed: 1,
      total: 1,
      duration: 2000,
      flows: [
        {
          flowName: 'ログイン',
          status: 'failed',
          duration: 2000,
          steps: [
            {
              index: 0,
              command: { command: 'click', selector: 'NotExist' as never },
              status: 'failed',
              duration: 2000,
              error: {
                message: 'Element not found',
                type: 'command_failed',
                screenshot: { status: 'disabled' },
              },
            },
          ],
          error: {
            message: 'Element not found',
            stepIndex: 0,
          },
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

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
    const mockOutput: RunFlowsOutput = {
      passed: 1,
      failed: 1,
      total: 2,
      duration: 3500,
      flows: [
        {
          flowName: 'フロー1',
          status: 'passed',
          duration: 1500,
          steps: [
            {
              index: 0,
              command: { command: 'open', url: 'https://example.com' as never },
              status: 'passed',
              duration: 1500,
              stdout: '',
            },
          ],
        },
        {
          flowName: 'フロー2',
          status: 'failed',
          duration: 2000,
          steps: [
            {
              index: 0,
              command: { command: 'click', selector: 'NotExist' as never },
              status: 'failed',
              duration: 2000,
              error: {
                message: 'Element not found',
                type: 'command_failed',
                screenshot: { status: 'disabled' },
              },
            },
          ],
          error: {
            message: 'Element not found',
            stepIndex: 0,
          },
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

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
    const mockOutput: RunFlowsOutput = {
      passed: 1,
      failed: 1,
      total: 2,
      duration: 3000,
      flows: [
        {
          flowName: 'フロー1',
          status: 'failed',
          duration: 2000,
          steps: [
            {
              index: 0,
              command: { command: 'click', selector: 'NotExist' as never },
              status: 'failed',
              duration: 2000,
              error: {
                message: 'Element not found',
                type: 'command_failed',
                screenshot: { status: 'disabled' },
              },
            },
          ],
          error: {
            message: 'Element not found',
            stepIndex: 0,
          },
        },
        {
          flowName: 'フロー2',
          status: 'passed',
          duration: 1000,
          steps: [
            {
              index: 0,
              command: { command: 'open', url: 'https://example.com' as never },
              status: 'passed',
              duration: 1000,
              stdout: '',
            },
          ],
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

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
        // runFlowsは1回呼ばれる（オーケストレーター内で全フローを実行）
        expect(vi.mocked(runFlows)).toHaveBeenCalledTimes(1);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * R-7: 正常終了時にformatterが適切に呼ばれる
   *
   * 前提条件: フローが正常に実行される（status: 'passed'）
   * 検証項目: formatter.successが適切に呼ばれること
   */
  it('R-7: 正常終了時にformatterが適切に呼ばれる', async () => {
    // Arrange
    const mockOutput: RunFlowsOutput = {
      passed: 1,
      failed: 0,
      total: 1,
      duration: 1500,
      flows: [
        {
          flowName: 'ログイン',
          status: 'passed',
          duration: 1500,
          steps: [
            {
              index: 0,
              command: { command: 'open', url: 'https://example.com' as never },
              status: 'passed',
              duration: 1500,
              stdout: '',
            },
          ],
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

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
    // formatter.successが呼び出されたことを確認
    expect(vi.mocked(formatter.success)).toHaveBeenCalledWith('PASSED: ログイン.enbu.yaml', 1500);
  });

  /**
   * R-8: 失敗終了時にエラー情報が表示される
   *
   * 前提条件: フローが失敗する（status: 'failed'）
   * 検証項目:
   * - formatter.failureが呼ばれること
   * - エラー情報が表示されること
   */
  it('R-8: 失敗終了時にエラー情報が表示される', async () => {
    // Arrange
    const mockOutput: RunFlowsOutput = {
      passed: 0,
      failed: 1,
      total: 1,
      duration: 2000,
      flows: [
        {
          flowName: 'ログイン',
          status: 'failed',
          duration: 2000,
          steps: [
            {
              index: 0,
              command: { command: 'click', selector: 'NotExist' as never },
              status: 'failed',
              duration: 2000,
              error: {
                message: 'Element not found',
                type: 'command_failed',
                screenshot: { status: 'disabled' },
              },
            },
          ],
          error: {
            message: 'Element not found',
            stepIndex: 0,
          },
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

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
    // formatter.failureが呼ばれることを確認
    expect(vi.mocked(formatter.failure)).toHaveBeenCalledWith('FAILED: ログイン.enbu.yaml', 2000);

    // エラー情報が表示されることを確認
    expect(vi.mocked(formatter.indent)).toHaveBeenCalledWith('Step 1 failed: Element not found', 1);
  });

  /**
   * R-9: verboseモードでステップ詳細が表示される
   *
   * 前提条件: verboseモードが有効
   * 検証項目: ステップごとの詳細が表示されること
   */
  it('R-9: verboseモードでステップ詳細が表示される', async () => {
    // Arrange
    const mockOutput: RunFlowsOutput = {
      passed: 1,
      failed: 0,
      total: 1,
      duration: 1500,
      flows: [
        {
          flowName: 'ログイン',
          status: 'passed',
          duration: 1500,
          steps: [
            {
              index: 0,
              command: { command: 'open', url: 'https://example.com' as never },
              status: 'passed',
              duration: 1500,
              stdout: '',
            },
          ],
        },
      ],
    };
    vi.mocked(runFlows).mockReturnValue(okAsync(mockOutput));

    // Act
    await runFlowCommand(
      {
        files: ['login.enbu.yaml'],
        headed: false,
        env: {},
        timeout: 30000,
        screenshot: false,
        verbose: true, // verboseモード有効
        progressJson: false,
      },
      formatter,
    );

    // Assert
    // ステップ詳細が表示されることを確認
    expect(vi.mocked(formatter.indent)).toHaveBeenCalledWith('Steps:', 1);
    expect(vi.mocked(formatter.indent)).toHaveBeenCalledWith(expect.stringContaining('Step 1:'), 2);
  });
});
