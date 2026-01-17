import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { autoWait } from '../auto-wait';
import type { ExecutionContext } from '../result';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
  parseSnapshotRefs: vi.fn(),
}));

import {
  executeCommand,
  parseJsonOutput,
  parseSnapshotRefs,
} from '@packages/agent-browser-adapter';

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
   * 検証項目: ok("Element found") が返される
   */
  it('AW-1: 要素が最初のsnapshotで見つかる場合、すぐに成功を返す', async () => {
    // Arrange: snapshotが "ログイン" 要素を含む
    vi.mocked(executeCommand).mockResolvedValue(
      ok(
        '{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}',
      ),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({
        success: true,
        data: { refs: { e1: { name: 'ログイン', role: 'button' } } },
        error: null,
      }),
    );
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({ e1: { name: 'ログイン', role: 'button' } }));

    // Act: ログイン要素を待機
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert: 成功が返される
    expect(result.isOk()).toBe(true);
    result.match(
      (message) => expect(message).toContain('found'),
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
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'))
      .mockResolvedValueOnce(
        ok(
          '{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}',
        ),
      );

    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }))
      .mockReturnValueOnce(
        ok({
          success: true,
          data: { refs: { e1: { name: 'ログイン', role: 'button' } } },
          error: null,
        }),
      );

    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}))
      .mockReturnValueOnce(ok({ e1: { name: 'ログイン', role: 'button' } }));

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
    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"refs":{}},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { refs: {} }, error: null }),
    );
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({}));

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
   * 検証項目: ok("No selector to wait for") が返される
   */
  it('AW-4: セレクタがundefinedの場合、スキップして成功を返す', async () => {
    // Act: undefinedセレクタで待機
    const result = await autoWait(undefined, mockContext);

    // Assert: スキップして成功が返される
    expect(result.isOk()).toBe(true);
    result.match(
      (message) => expect(message).toContain('No selector'),
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
    vi.mocked(executeCommand).mockResolvedValue(
      ok(
        '{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}',
      ),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({
        success: true,
        data: { refs: { e1: { name: 'ログイン', role: 'button' } } },
        error: null,
      }),
    );
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({ e1: { name: 'ログイン', role: 'button' } }));

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
   * 前提条件: parseSnapshotRefs が err を返す
   * 検証項目: err({ type: 'parse_error' }) が返される
   */
  it('AW-6: snapshotのパースが失敗した場合、エラーを返す', async () => {
    // Arrange: snapshotのパースが失敗
    vi.mocked(executeCommand).mockResolvedValue(
      ok('{"success":true,"data":{"refs":{}},"error":null}'),
    );
    vi.mocked(parseJsonOutput).mockReturnValue(
      ok({ success: true, data: { refs: {} }, error: null }),
    );
    vi.mocked(parseSnapshotRefs).mockReturnValue(
      err({ type: 'parse_error', message: 'Invalid refs', rawOutput: '' }),
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
        expect(error.type).toBe('parse_error');
      },
    );
  });
});
