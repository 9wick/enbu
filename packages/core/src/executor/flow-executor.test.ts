import type { CssSelector, InteractableTextSelector, Url } from '@packages/agent-browser-adapter';
import { errAsync, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Flow } from '../types';
import { executeFlow } from './flow-executor';
import type { FlowExecutionOptions } from './result';
import { isPassedFlowResult, NO_CALLBACK } from './result';

// テスト用: 文字列をBranded Typeに変換（テストではキャストで対応）
const toUrl = (s: string) => s as Url;
const toCssSelector = (s: string) => s as CssSelector;
const toInteractableTextSelector = (s: string) => s as InteractableTextSelector;

/**
 * テスト用のデフォルトFlowExecutionOptionsを生成する
 *
 * @param overrides - 上書きするプロパティ
 * @returns FlowExecutionOptions
 */
const createTestOptions = (
  overrides: Partial<FlowExecutionOptions> = {},
): FlowExecutionOptions => ({
  sessionName: 'test-session',
  headed: false,
  env: {},
  autoWaitTimeoutMs: 5000,
  autoWaitIntervalMs: 500,
  commandTimeoutMs: 30000,
  cwd: '/tmp',
  screenshot: false,
  bail: true,
  onStepProgress: NO_CALLBACK,
  ...overrides,
});

// モック設定
vi.mock('@packages/agent-browser-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@packages/agent-browser-adapter')>();
  return {
    ...actual,
    browserOpen: vi.fn(),
    browserClick: vi.fn(),
    browserFill: vi.fn(),
    browserSnapshot: vi.fn(),
    browserWaitForMs: vi.fn(),
    browserScreenshot: vi.fn(),
    browserIsVisible: vi.fn(),
  };
});

import {
  browserClick,
  browserFill,
  browserIsVisible,
  browserOpen,
  browserScreenshot,
  browserSnapshot,
  browserWaitForMs,
} from '@packages/agent-browser-adapter';

describe('executeFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // エラー時スクリーンショット用のデフォルトモック
    vi.mocked(browserScreenshot).mockReturnValue(okAsync({ path: '/tmp/screenshot.png' }));
    // セレクタ待機用のデフォルトモック（要素が常に表示されている状態）
    vi.mocked(browserIsVisible).mockReturnValue(okAsync({ visible: true }));
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
        { command: 'open', url: toUrl('https://example.com') },
        { command: 'click', interactableText: toInteractableTextSelector('ログイン') },
      ],
    };

    const options = createTestOptions();

    // open コマンドのモック
    vi.mocked(browserOpen).mockReturnValueOnce(okAsync({ url: 'https://example.com' }));

    // 自動待機用の snapshot のモック（textセレクタのため）
    vi.mocked(browserSnapshot).mockReturnValueOnce(
      okAsync({ snapshot: '', refs: { e1: { name: 'ログイン', role: 'button' } } }),
    );

    // click コマンドのモック
    vi.mocked(browserClick).mockReturnValueOnce(okAsync({}));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // デバッグ用: 失敗時のエラー内容を確認
        if (flowResult.status === 'failed') {
          const failedStep = flowResult.steps.find((s) => s.status === 'failed');
          throw new Error(`Step failed: ${JSON.stringify(failedStep, null, 2)}`);
        }
        expect(flowResult.status).toBe('passed');
        expect(flowResult.steps).toHaveLength(2);
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[0].command.command).toBe('open');
        expect(flowResult.steps[1].status).toBe('passed');
        expect(flowResult.steps[1].command.command).toBe('click');
        // status='passed'の場合、errorフィールドは存在しない
        expect(isPassedFlowResult(flowResult)).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FE-3: 環境変数が展開済みのフローを正しく実行できる
   *
   * 前提条件: 環境変数が解決済みのフロー（Parser層で展開済み）
   * 検証項目: 実行されるコマンドが期待通りの値を持つ
   *
   * @remarks
   * 環境変数の展開はParser層（env-resolver）で行われるため、
   * executeFlowには展開済みのフローが渡される前提。
   */
  it('FE-3: 環境変数が展開済みのフローを正しく実行できる', async () => {
    // Arrange
    // 環境変数は既にParser層で展開済みの状態
    const flow: Flow = {
      name: 'パラメータ化フロー',
      env: {},
      steps: [
        { command: 'open', url: toUrl('https://example.com/login') },
        { command: 'fill', css: toCssSelector('#email'), value: 'test@example.com' },
      ],
    };

    const options = createTestOptions();

    // open コマンドのモック
    vi.mocked(browserOpen).mockReturnValue(okAsync({ url: 'https://example.com/login' }));

    // fill コマンドのモック（cssセレクタを使用するためautoWaitは不要）
    vi.mocked(browserFill).mockReturnValue(okAsync({}));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // 展開済みのコマンドが正しく実行されていることを確認
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

    const options = createTestOptions();

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
      steps: [{ command: 'open', url: toUrl('https://example.com') }],
    };

    const options = createTestOptions();

    vi.mocked(browserOpen).mockReturnValueOnce(
      errAsync({ type: 'not_installed', message: 'agent-browser not found' }),
    );

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        const step0 = flowResult.steps[0];
        expect(step0.status).toBe('failed');
        if (step0.status === 'failed') {
          expect(step0.error.type).toBe('not_installed');
        }
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
        { command: 'open', url: toUrl('https://example.com') },
        { command: 'wait', ms: 100 },
      ],
    };

    const options = createTestOptions();

    vi.mocked(browserOpen).mockReturnValue(okAsync({ url: 'https://example.com' }));
    vi.mocked(browserWaitForMs).mockReturnValue(okAsync({}));

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
   * 検証項目: StepResult.error.screenshot.status が 'disabled'
   */
  it('FE-9: screenshot: false の場合、スクリーンショットを撮影しない', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'click', css: toCssSelector('#not-exist') }],
    };

    const options = createTestOptions({
      screenshot: false,
    });

    // click コマンドを失敗させる（存在しない要素）
    vi.mocked(browserClick).mockReturnValueOnce(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'click',
        args: ['#not-exist'],
        stderr: 'Element not found',
        exitCode: 1,
        rawError: 'Element not found',
      }),
    );

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        const step0 = flowResult.steps[0];
        if (step0.status === 'failed') {
          expect(step0.error.screenshot).toEqual({ status: 'disabled' });
        }
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
      steps: [{ command: 'open', url: toUrl('https://example.com') }],
    };

    const options = createTestOptions({
      sessionName: 'test-session-success',
    });

    vi.mocked(browserOpen).mockReturnValueOnce(okAsync({ url: 'https://example.com' }));

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
      steps: [{ command: 'open', url: toUrl('https://example.com') }],
    };

    const options = createTestOptions({
      sessionName: 'test-session-failure',
    });

    vi.mocked(browserOpen).mockReturnValueOnce(
      errAsync({ type: 'not_installed', message: 'agent-browser not found' }),
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
        { command: 'open', url: toUrl('https://example.com') },
        { command: 'click', css: toCssSelector('#not-exist-button') },
        { command: 'click', css: toCssSelector('#next-button') }, // これは実行されないはず
      ],
    };

    const options = createTestOptions();

    // 1番目のステップ: open 成功
    vi.mocked(browserOpen).mockReturnValueOnce(okAsync({ url: 'https://example.com' }));

    // 2番目のステップ: click 失敗（要素が見つからない）
    vi.mocked(browserClick).mockReturnValueOnce(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'click',
        args: ['#not-exist-button'],
        stderr: 'Element not found',
        exitCode: 1,
        rawError: 'Element not found',
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

        // ステップは失敗したところまでしか実行されない（2ステップ）
        expect(flowResult.steps).toHaveLength(2);

        // 1番目は成功
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[0].command.command).toBe('open');

        // 2番目は失敗
        expect(flowResult.steps[1].status).toBe('failed');
        expect(flowResult.steps[1].command.command).toBe('click');

        // エラー情報が正しく設定されている（FailedFlowResultの場合）
        if (flowResult.status === 'failed') {
          expect(flowResult.error).toBeDefined();
          expect(flowResult.error.stepIndex).toBe(1);
        }

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
        { command: 'open', url: toUrl('https://example.com') },
        { command: 'click', css: toCssSelector('#button1') },
        { command: 'click', css: toCssSelector('#button2') },
      ],
    };

    const options = createTestOptions();

    // 1番目のステップ: open 失敗（agent-browser接続エラー）
    vi.mocked(browserOpen).mockReturnValueOnce(
      errAsync({
        type: 'command_failed',
        message: 'Connection refused',
        command: 'open',
        args: ['https://example.com'],
        stderr: 'Connection refused',
        exitCode: 1,
        rawError: 'Connection refused',
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

        // エラー情報（FailedFlowResultの場合）
        if (flowResult.status === 'failed') {
          expect(flowResult.error.stepIndex).toBe(0);
        }

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
        { command: 'open', url: toUrl('https://example.com') },
        { command: 'click', css: toCssSelector('#not-exist-button') },
        { command: 'click', css: toCssSelector('#next-button') },
      ],
    };

    const progressCalls: Array<{ stepIndex: number; status: string }> = [];
    const options = createTestOptions({
      onStepProgress: (progress) => {
        progressCalls.push({ stepIndex: progress.stepIndex, status: progress.status });
      },
    });

    // 1番目のステップ: open 成功
    vi.mocked(browserOpen).mockReturnValueOnce(okAsync({ url: 'https://example.com' }));

    // 2番目のステップ: click 失敗
    vi.mocked(browserClick).mockReturnValueOnce(
      errAsync({
        type: 'command_failed',
        message: 'Element not found',
        command: 'click',
        args: ['#not-exist-button'],
        stderr: 'Element not found',
        exitCode: 1,
        rawError: 'Element not found',
      }),
    );

    // Act
    const result = await executeFlow(flow, options);

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
