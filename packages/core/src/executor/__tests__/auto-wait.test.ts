import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { autoWait } from '../auto-wait';
import type { ExecutionContext } from '../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  browserSnapshot: vi.fn(),
}));

import { browserSnapshot } from '@packages/agent-browser-adapter';

describe('autoWait', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockContext: ExecutionContext = {
    sessionName: 'test',
    executeOptions: {
      sessionName: 'test',
      headed: false,
      timeoutMs: 30000,
    },
    env: {},
    autoWaitTimeoutMs: 1000,
    autoWaitIntervalMs: 100,
  };

  /**
   * AW-1: 要素が最初のsnapshotで見つかる
   *
   * 前提条件: snapshot に "ログイン" が含まれる
   * 検証項目: ok({ resolvedRef: '@e1' }) が返される
   */
  it('AW-1: 要素が最初のsnapshotで見つかる場合、すぐに成功を返す', async () => {
    // Arrange: snapshotが "ログイン" 要素を含む
    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({
        success: true,
        data: { snapshot: '', refs: { e1: { name: 'ログイン', role: 'button' } } },
        error: null,
      }),
    );

    // Act: ログイン要素を待機
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: 成功が返され、解決されたrefが含まれる
    expect(result.isOk()).toBe(true);
    result.match(
      (value) => expect(value?.resolvedRef).toBe('@e1'),
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * AW-2: 要素が2回目のポーリングで見つかる
   *
   * 前提条件: 1回目のsnapshotでは空、2回目で要素が出現
   * 検証項目: ok("Element found") が返される
   */
  it('AW-2: ポーリングで要素が見つかる場合、成功を返す', async () => {
    // Arrange: 1回目は空、2回目でログイン要素が出現
    vi.mocked(browserSnapshot)
      .mockResolvedValueOnce(ok({ success: true, data: { snapshot: '', refs: {} }, error: null }))
      .mockResolvedValueOnce(
        ok({
          success: true,
          data: { snapshot: '', refs: { e1: { name: 'ログイン', role: 'button' } } },
          error: null,
        }),
      );

    // Act: ログイン要素を待機
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: 成功が返される
    expect(result.isOk()).toBe(true);
  });

  /**
   * AW-3: タイムアウトまで要素が見つからない
   *
   * 前提条件: autoWaitTimeoutMs=1000、要素が出現しない
   * 検証項目: err({ type: 'timeout' }) が返される
   */
  it('AW-3: タイムアウトまで要素が見つからない場合、timeoutエラーを返す', async () => {
    // Arrange: 常に空のsnapshotを返す
    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({ success: true, data: { snapshot: '', refs: {} }, error: null }),
    );

    // Act: 存在しない要素を待機
    const promise = autoWait('NotExist', mockContext);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    // Assert: タイムアウトエラーが返される
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('timeout');
        if (error.type === 'timeout') {
          expect(error.timeoutMs).toBe(1000);
        }
      },
    );
  });

  /**
   * AW-4: セレクタが undefined の場合
   *
   * 前提条件: selector が undefined
   * 検証項目: ok(undefined) が返される（待機スキップ）
   */
  it('AW-4: セレクタがundefinedの場合、スキップして成功を返す', async () => {
    // Act: undefinedセレクタで待機
    const result = await autoWait(undefined, mockContext);

    // Assert: スキップして成功が返される（値はundefined）
    expect(result.isOk()).toBe(true);
    result.match(
      (value) => expect(value).toBeUndefined(),
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * AW-5: @e1 形式の参照IDが見つかる
   *
   * 前提条件: セレクタが "@e1"
   * 検証項目: refs["e1"] が存在すれば成功
   */
  it('AW-5: 参照ID形式のセレクタで要素が見つかる', async () => {
    // Arrange: snapshotが e1 参照を含む
    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({
        success: true,
        data: { snapshot: '', refs: { e1: { name: 'ログイン', role: 'button' } } },
        error: null,
      }),
    );

    // Act: @e1 参照IDで待機
    const promise = autoWait('@e1', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: 成功が返される
    expect(result.isOk()).toBe(true);
  });

  /**
   * AW-6: snapshotのパースが失敗
   *
   * 前提条件: browserSnapshot が err を返す
   * 検証項目: err({ type: 'agent_browser_output_parse_error' }) が返される
   */
  it('AW-6: snapshotのパースが失敗した場合、エラーを返す', async () => {
    // Arrange: snapshotのパースが失敗
    vi.mocked(browserSnapshot).mockResolvedValue(
      err({
        type: 'agent_browser_output_parse_error',
        message: 'Invalid refs',
        command: 'snapshot',
        issues: [],
        rawOutput: '',
      }),
    );

    // Act: ログイン要素を待機
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: パースエラーが返される
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

  /**
   * AW-7: 複数の要素にマッチする場合
   *
   * 前提条件: snapshot に「詳細を見る」が複数存在する
   * 検証項目: err({ type: 'validation_error' }) が返される
   */
  it('AW-7: 複数の要素にマッチする場合、validation_errorを返す', async () => {
    // Arrange: snapshotに「詳細を見る」リンクが複数含まれる
    const multipleRefs = {
      e1: { name: 'オンラインショップ', role: 'heading' },
      e2: { name: '詳細を見る', role: 'link' },
      e3: { name: 'カートに追加', role: 'button' },
      e4: { name: '詳細を見る', role: 'link' },
      e5: { name: '詳細を見る', role: 'link' },
    };

    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({ success: true, data: { snapshot: '', refs: multipleRefs }, error: null }),
    );

    // Act: 「詳細を見る」を待機
    const promise = autoWait('詳細を見る', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: validation_errorが返される
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('validation_error');
        if (error.type === 'validation_error') {
          expect(error.message).toContain('matched 3 elements');
          expect(error.message).toContain('詳細を見る');
        }
      },
    );
  });

  /**
   * AW-8: 一意にマッチする場合は成功
   *
   * 前提条件: snapshot に「ログイン」が1つだけ存在する（他の要素も存在）
   * 検証項目: ok({ resolvedRef: '@e2' }) が返される
   */
  it('AW-8: 一意にマッチする場合は成功を返す', async () => {
    // Arrange: 「ログイン」は1つだけ、他の要素も存在
    const refs = {
      e1: { name: 'オンラインショップ', role: 'heading' },
      e2: { name: 'ログイン', role: 'link' },
      e3: { name: 'カートに追加', role: 'button' },
      e4: { name: '詳細を見る', role: 'link' },
    };

    vi.mocked(browserSnapshot).mockResolvedValue(
      ok({ success: true, data: { snapshot: '', refs }, error: null }),
    );

    // Act: 「ログイン」を待機
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: 成功が返され、解決されたrefが含まれる
    expect(result.isOk()).toBe(true);
    result.match(
      (value) => expect(value?.resolvedRef).toBe('@e2'),
      () => {
        throw new Error('Expected ok result');
      },
    );
  });
});
