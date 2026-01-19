import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { executeFlow } from '../flow-executor';
import type { Flow } from '../../types';
import type { FlowExecutionOptions } from '../result';

// モック設定
vi.mock('@packages/agent-browser-adapter', () => ({
  browserOpen: vi.fn(),
  browserClick: vi.fn(),
  browserFill: vi.fn(),
  browserSnapshot: vi.fn(),
  browserWaitForMs: vi.fn(),
  browserScreenshot: vi.fn(),
  asUrl: vi.fn((v) => ok(v)),
  asSelector: vi.fn((v) => ok(v)),
  asFilePath: vi.fn((v) => ok(v)),
}));

import {
  browserOpen,
  browserClick,
  browserFill,
  browserSnapshot,
  browserWaitForMs,
  browserScreenshot,
} from '@packages/agent-browser-adapter';

describe('executeFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // エラー時スクリーンショット用のデフォルトモック
    vi.mocked(browserScreenshot).mockResolvedValue(
      ok({ success: true, data: { path: '/tmp/screenshot.png' }, error: null }),
    );
  });

  /**
   * FE-1: 全ステップが成功する単純なフロー
   *
   * 前提条件: open と click の2ステップを含むフロー
   * 検証項目:
   *   - FlowResult.status === 'passed'
   *   - FlowResult.steps.length === 2
   *   - 各ステップのstatus === 'passed'
   */
  it('FE-1: 全ステップが成功する場合、passedステータスを返す', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'ログイン' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // open コマンドのモック
    vi.mocked(browserOpen).mockResolvedValueOnce(
      ok({ success: true, data: { url: 'https://example.com' }, error: null }),
    );

    // 自動待機用の snapshot のモック
    vi.mocked(browserSnapshot).mockResolvedValueOnce(
      ok({
        success: true,
        data: { snapshot: '', refs: { e1: { name: 'ログイン', role: 'button' } } },
        error: null,
      }),
    );

    // click コマンドのモック
    vi.mocked(browserClick).mockResolvedValueOnce(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('passed');
        expect(flowResult.steps).toHaveLength(2);
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[0].command.command).toBe('open');
        expect(flowResult.steps[1].status).toBe('passed');
        expect(flowResult.steps[1].command.command).toBe('click');
        expect(flowResult.error).toBeUndefined();
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-3: 環境変数が正しく展開される
   *
   * 前提条件: フローに ${BASE_URL} と ${USER_EMAIL} を含む
   * 検証項目: 実行されるコマンドで環境変数が置換されている
   */
  it('FE-3: 環境変数が正しく展開される', async () => {
    // Arrange
    const flow: Flow = {
      name: 'パラメータ化フロー',
      env: {},
      steps: [
        { command: 'open', url: '${BASE_URL}/login' },
        { command: 'fill', selector: 'email', value: '${USER_EMAIL}' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      env: {
        BASE_URL: 'https://example.com',
        USER_EMAIL: 'test@example.com',
      },
    };

    // open コマンドのモック
    vi.mocked(browserOpen).mockResolvedValue(
      ok({ success: true, data: { url: 'https://example.com/login' }, error: null }),
    );

    // 自動待機のモック
    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({
        success: true,
        data: { snapshot: '', refs: { e1: { name: 'email', role: 'textbox' } } },
        error: null,
      }),
    );

    // fill コマンドのモック
    vi.mocked(browserFill).mockResolvedValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // 展開後のコマンドを確認
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((flowResult.steps[0].command as any).url).toBe('https://example.com/login');
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((flowResult.steps[1].command as any).value).toBe('test@example.com');
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-4: 存在しない環境変数はエラー
   *
   * 前提条件: ${UNDEFINED_VAR} を含むフロー
   * 検証項目: validation_errorが返される
   */
  it('FE-4: 存在しない環境変数はエラーになる', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${UNDEFINED_VAR}/path' }],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      env: {},
    };

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    // 環境変数展開エラーはerrを返す
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('validation_error');
        if (error.type === 'validation_error') {
          expect(error.message).toContain('環境変数');
          expect(error.message).toContain('${UNDEFINED_VAR}');
        }
      },
    );
  });

  /**
   * FE-6: 空のフロー(ステップなし)
   *
   * 前提条件: steps が空配列
   * 検証項目: FlowResult { status: 'passed', steps: [] }
   */
  it('FE-6: 空のフローは成功ステータスを返す', async () => {
    // Arrange
    const flow: Flow = {
      name: '空のフロー',
      env: {},
      steps: [],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('passed');
        expect(flowResult.steps).toHaveLength(0);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-7: agent-browser未インストール
   *
   * 前提条件: browserOpen が not_installed エラーを返す
   * 検証項目: FlowResult { status: 'failed', error: { type: 'not_installed' } }
   */
  it('FE-7: agent-browserが未インストールの場合、failedステータスを返す', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: 'https://example.com' }],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    vi.mocked(browserOpen).mockResolvedValueOnce(
      err({ type: 'not_installed', message: 'agent-browser not found' }),
    );

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.steps[0].status).toBe('failed');
        expect(flowResult.steps[0].error?.type).toBe('not_installed');
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-8: 実行時間が正しく記録される
   *
   * 前提条件: 複数ステップのフロー
   * 検証項目: FlowResult.duration と各 StepResult.duration が設定される（数値型であること）
   */
  it('FE-8: 実行時間が正しく記録される', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'wait', ms: 100 },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    vi.mocked(browserOpen).mockResolvedValue(
      ok({ success: true, data: { url: 'https://example.com' }, error: null }),
    );
    vi.mocked(browserWaitForMs).mockResolvedValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // 実行時間が数値型で記録されていることを確認
        expect(typeof flowResult.duration).toBe('number');
        expect(flowResult.duration).toBeGreaterThanOrEqual(0);
        expect(typeof flowResult.steps[0].duration).toBe('number');
        expect(flowResult.steps[0].duration).toBeGreaterThanOrEqual(0);
        expect(typeof flowResult.steps[1].duration).toBe('number');
        expect(flowResult.steps[1].duration).toBeGreaterThanOrEqual(0);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-9: screenshot: false の場合、失敗時にスクリーンショットを撮影しない
   *
   * 前提条件: screenshot: false を指定、click が失敗
   * 検証項目: StepResult.error.screenshot が undefined
   */
  it('FE-9: screenshot: false の場合、スクリーンショットを撮影しない', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'click', selector: 'NotExist' }],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      screenshot: false,
    };

    // 自動待機がタイムアウト（常に空のrefsを返す）
    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({ success: true, data: { snapshot: '', refs: {} }, error: null }),
    );

    // タイマーを使用して時間経過をシミュレート
    vi.useFakeTimers();
    const promise = executeFlow(flow, options);
    await vi.advanceTimersByTimeAsync(31000); // デフォルトタイムアウトを超える
    const result = await promise;
    vi.useRealTimers();

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.steps[0].error?.screenshot).toBeUndefined();
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-10: FlowResultにsessionNameが含まれる（成功時）
   *
   * 前提条件: 正常に実行されるフロー
   * 検証項目: FlowResult.sessionName が options.sessionName と一致すること
   */
  it('FE-10: FlowResultにsessionNameが含まれる（成功時）', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: 'https://example.com' }],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session-success',
    };

    vi.mocked(browserOpen).mockResolvedValueOnce(
      ok({ success: true, data: { url: 'https://example.com' }, error: null }),
    );

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('passed');
        expect(flowResult.sessionName).toBe('test-session-success');
        expect(flowResult.sessionName).toBe(options.sessionName);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-11: FlowResultにsessionNameが含まれる（失敗時）
   *
   * 前提条件: agent-browserが未インストールでコマンドが失敗
   * 検証項目: FlowResult.sessionName が options.sessionName と一致すること（status: 'failed' でも）
   */
  it('FE-11: FlowResultにsessionNameが含まれる（失敗時）', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: 'https://example.com' }],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session-failure',
    };

    vi.mocked(browserOpen).mockResolvedValueOnce(
      err({ type: 'not_installed', message: 'agent-browser not found' }),
    );

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.sessionName).toBe('test-session-failure');
        expect(flowResult.sessionName).toBe(options.sessionName);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-12: ステップが失敗したら後続のステップは実行されない
   *
   * 仕様:
   *   - 1ファイルの中のstepが失敗したらそのflowは失敗
   *   - 失敗後の後続ステップは実行されない（実行してもずれる）
   *
   * 前提条件: 3ステップのフロー、2番目のステップで失敗
   * 検証項目:
   *   - FlowResult.status === 'failed'
   *   - steps配列には失敗したステップまでしか含まれない（2つ）
   *   - 3番目のステップは実行されていない
   */
  it('FE-12: ステップが失敗したら後続のステップは実行されない', async () => {
    // Arrange: 3ステップのフロー
    const flow: Flow = {
      name: 'ステップ失敗テスト',
      env: {},
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: '存在しないボタン' },
        { command: 'click', selector: '次のボタン' }, // これは実行されないはず
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // 1番目のステップ: open 成功
    vi.mocked(executeCommand).mockResolvedValueOnce(
      ok('{"success":true,"data":{"url":"https://example.com"},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValueOnce(
      ok({ success: true, data: { url: 'https://example.com' }, error: null }),
    );

    // 2番目のステップ: click 自動待機でタイムアウト（要素が見つからない）
    // 自動待機が空のsnapshotを返し続ける
    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"refs":{}},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { refs: {} }, error: null }),
    );
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({}));

    // タイマーを使用して自動待機のタイムアウトをシミュレート
    vi.useFakeTimers();
    const promise = executeFlow(flow, { ...options, autoWaitTimeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    vi.useRealTimers();

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // フロー全体が失敗
        expect(flowResult.status).toBe('failed');

        // ステップは失敗したところまでしか実行されない（2ステップ）
        expect(flowResult.steps).toHaveLength(2);

        // 1番目は成功
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[0].command.command).toBe('open');

        // 2番目は失敗
        expect(flowResult.steps[1].status).toBe('failed');
        expect(flowResult.steps[1].command.command).toBe('click');

        // エラー情報が正しく設定されている
        expect(flowResult.error).toBeDefined();
        expect(flowResult.error?.stepIndex).toBe(1);

        // 3番目のステップは実行されていない（stepsに含まれない）
        // つまり steps.length === 2 であることで保証
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-13: 最初のステップが失敗した場合も後続は実行されない
   *
   * 仕様: 失敗したら即停止
   *
   * 前提条件: 3ステップのフロー、1番目のステップで失敗
   * 検証項目:
   *   - FlowResult.status === 'failed'
   *   - steps配列には1つだけ
   *   - 2, 3番目のステップは実行されていない
   */
  it('FE-13: 最初のステップが失敗した場合も後続は実行されない', async () => {
    // Arrange: 3ステップのフロー
    const flow: Flow = {
      name: '最初のステップ失敗テスト',
      env: {},
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'ボタン1' },
        { command: 'click', selector: 'ボタン2' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // 1番目のステップ: open 失敗（agent-browser接続エラー）
    vi.mocked(executeCommand).mockResolvedValueOnce(
      err({
        type: 'command_failed',
        message: 'Connection refused',
        command: 'open',
        args: ['https://example.com'],
        stderr: 'Connection refused',
        exitCode: 1,
        errorMessage: 'Connection refused',
      }),
    );

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // フロー全体が失敗
        expect(flowResult.status).toBe('failed');

        // 1ステップだけ実行された
        expect(flowResult.steps).toHaveLength(1);
        expect(flowResult.steps[0].status).toBe('failed');
        expect(flowResult.steps[0].command.command).toBe('open');

        // エラー情報
        expect(flowResult.error?.stepIndex).toBe(0);

        // 2, 3番目のステップは実行されていない
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-14: onStepProgressコールバックは失敗したステップまでしか呼ばれない
   *
   * 仕様: ステップが失敗したら後続は実行されない
   *
   * 前提条件: 3ステップのフロー、2番目で失敗、onStepProgressコールバック付き
   * 検証項目:
   *   - startedは2回呼ばれる（step 0, step 1）
   *   - completedも2回呼ばれる（step 0, step 1）
   *   - step 2のstartedは呼ばれない
   */
  it('FE-14: onStepProgressコールバックは失敗したステップまでしか呼ばれない', async () => {
    // Arrange
    const flow: Flow = {
      name: 'コールバックテスト',
      env: {},
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: '存在しないボタン' },
        { command: 'click', selector: '次のボタン' },
      ],
    };

    const progressCalls: Array<{ stepIndex: number; status: string }> = [];
    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      autoWaitTimeoutMs: 100,
      onStepProgress: (progress) => {
        progressCalls.push({ stepIndex: progress.stepIndex, status: progress.status });
      },
    };

    // 1番目のステップ: open 成功
    vi.mocked(executeCommand).mockResolvedValueOnce(
      ok('{"success":true,"data":{"url":"https://example.com"},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValueOnce(
      ok({ success: true, data: { url: 'https://example.com' }, error: null }),
    );

    // 2番目のステップ: 自動待機タイムアウト
    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"refs":{}},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { refs: {} }, error: null }),
    );
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({}));

    // Act
    vi.useFakeTimers();
    const promise = executeFlow(flow, options);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    vi.useRealTimers();

    // Assert
    expect(result.isOk()).toBe(true);

    // step 0: started, completed
    // step 1: started, completed（失敗）
    // step 2: 呼ばれない
    expect(progressCalls).toEqual([
      { stepIndex: 0, status: 'started' },
      { stepIndex: 0, status: 'completed' },
      { stepIndex: 1, status: 'started' },
      { stepIndex: 1, status: 'completed' },
    ]);

    // step 2のstartedは呼ばれていない
    expect(progressCalls.find((c) => c.stepIndex === 2)).toBeUndefined();
  });
});
