# Phase 3: テスト仕様

このドキュメントは `@packages/core/executor` のテストケースと受け入れ基準を定義します。

---

## テストファイル構成

```
packages/core/src/executor/__tests__/
├── flow-executor.test.ts        # executeFlow のテスト
├── auto-wait.test.ts            # 自動待機ロジックのテスト
├── env-expander.test.ts         # 環境変数展開のテスト
└── commands/
    ├── navigation.test.ts       # open
    ├── interaction.test.ts      # click, type, fill, press
    ├── hover-select.test.ts     # hover, select
    ├── scroll.test.ts           # scroll, scrollintoview
    ├── wait.test.ts             # wait
    ├── capture.test.ts          # screenshot, snapshot
    ├── eval.test.ts             # eval
    └── assertions.test.ts       # assertVisible, assertEnabled, assertChecked
```

---

## テスト方針

### モックの使用

- `@packages/agent-browser-adapter` の `executeCommand` をモック
- 各テストケースで期待する出力を直接設定
- 実際の agent-browser は呼び出さない

### モックの実装例

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';

// agent-browser-adapter をモック
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
  parseSnapshotRefs: vi.fn(),
}));

import { executeCommand, parseJsonOutput, parseSnapshotRefs } from '@packages/agent-browser-adapter';

/**
 * executeCommand のモックヘルパー
 */
const mockExecuteCommand = (stdout: string) => {
  vi.mocked(executeCommand).mockResolvedValueOnce(ok(stdout));
};

/**
 * parseJsonOutput のモックヘルパー
 */
const mockParseJsonOutput = (output: unknown) => {
  vi.mocked(parseJsonOutput).mockReturnValueOnce(ok(output));
};

/**
 * parseSnapshotRefs のモックヘルパー
 */
const mockParseSnapshotRefs = (refs: Record<string, { name: string; role: string }>) => {
  vi.mocked(parseSnapshotRefs).mockReturnValueOnce(ok(refs));
};
```

---

## 1. flow-executor.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| FE-1 | 全ステップが成功する単純なフロー | `FlowResult { status: 'passed', steps: [...] }` |
| FE-2 | 2ステップ目で失敗するフロー | `FlowResult { status: 'failed', error: { stepIndex: 1 } }` |
| FE-3 | 環境変数が正しく展開される | 各コマンドで `${VAR}` が置換されている |
| FE-4 | 存在しない環境変数は空文字列になる | `${UNDEFINED_VAR}` → `""` |
| FE-5 | 失敗時にスクリーンショットが撮影される | `error.screenshot` にパスが設定される |
| FE-6 | 空のフロー（ステップなし） | `FlowResult { status: 'passed', steps: [] }` |
| FE-7 | agent-browser未インストール | `err({ type: 'not_installed' })` |
| FE-8 | 実行時間が正しく記録される | `FlowResult.duration` と各 `StepResult.duration` が設定される |
| FE-9 | screenshot: false の場合、失敗時にスクリーンショットを撮影しない | `StepResult.error.screenshot` が `undefined` |
| FE-10 | bail: true（デフォルト）の場合、最初の失敗で中断 | 失敗ステップ以降は実行されない |
| FE-11 | bail: false の場合、失敗してもスキップして続行 | 全ステップが実行され、複数の失敗が記録される |

### テストコード

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { executeFlow } from '../flow-executor';
import type { Flow } from '../../types';
import type { FlowExecutionOptions } from '../result';

// モック設定
vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
  parseSnapshotRefs: vi.fn(),
}));

import { executeCommand, parseJsonOutput, parseSnapshotRefs } from '@packages/agent-browser-adapter';

describe('executeFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'ログイン' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // open コマンドのモック
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"url":"https://example.com"},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { url: 'https://example.com' }, error: null }));

    // 自動待機用の snapshot のモック
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: { e1: { name: 'ログイン', role: 'button' } } }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({ e1: { name: 'ログイン', role: 'button' } }));

    // click コマンドのモック
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"clicked":true},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { clicked: true }, error: null }));

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
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-2: 2ステップ目で失敗するフロー
   *
   * 前提条件: open（成功）→ click（失敗）
   * 検証項目:
   *   - FlowResult.status === 'failed'
   *   - FlowResult.error.stepIndex === 1
   *   - FlowResult.steps.length === 2（失敗ステップまで実行される）
   */
  it('FE-2: ステップが失敗した場合、failedステータスとエラー情報を返す', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'NotExist' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // open コマンドのモック（成功）
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: {}, error: null }));

    // 自動待機用の snapshot のモック（要素が見つからずタイムアウト）
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}));

    // タイムアウトのシミュレーション（実際のテストでは vi.useFakeTimers を使用）
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(err({ type: 'timeout', command: 'auto-wait', args: ['NotExist'], timeoutMs: 30000 }));

    // スクリーンショット撮影のモック
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"path":"/tmp/flow-error-123.png"},"error":null}'));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.error).toBeDefined();
        expect(flowResult.error?.stepIndex).toBe(1);
        expect(flowResult.error?.message).toContain('Auto-wait timeout');
        expect(flowResult.error?.screenshot).toBeDefined();
        expect(flowResult.steps).toHaveLength(2);
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[1].status).toBe('failed');
      },
      () => { throw new Error('Expected ok result'); }
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
    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // 自動待機のモック
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({ e1: { name: 'email', role: 'textbox' } }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        // 展開後のコマンドを確認
        expect((flowResult.steps[0].command as any).url).toBe('https://example.com/login');
        expect((flowResult.steps[1].command as any).value).toBe('test@example.com');
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-4: 存在しない環境変数は空文字列になる
   *
   * 前提条件: ${UNDEFINED_VAR} を含むフロー
   * 検証項目: 展開後に空文字列になっている
   */
  it('FE-4: 存在しない環境変数は空文字列に置換される', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: '${UNDEFINED_VAR}/path' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      env: {},
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect((flowResult.steps[0].command as any).url).toBe('/path');
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-5: 失敗時にスクリーンショットが撮影される
   *
   * 前提条件: click が失敗
   * 検証項目: StepResult.error.screenshot にパスが設定される
   */
  it('FE-5: 失敗時にスクリーンショットが撮影される', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'click', selector: 'NotExist' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    // 自動待機がタイムアウト
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'))
      .mockResolvedValueOnce(ok('{"success":true,"data":{"path":"/tmp/flow-error-456.png"},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.steps[0].error?.screenshot).toBe('/tmp/flow-error-456.png');
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-6: 空のフロー（ステップなし）
   *
   * 前提条件: steps が空配列
   * 検証項目: FlowResult { status: 'passed', steps: [] }
   */
  it('FE-6: 空のフローは成功ステータスを返す', async () => {
    // Arrange
    const flow: Flow = {
      name: '空のフロー',
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
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-7: agent-browser未インストール
   *
   * 前提条件: executeCommand が not_installed エラーを返す
   * 検証項目: err({ type: 'not_installed' })
   */
  it('FE-7: agent-browserが未インストールの場合、エラーを返す', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: 'https://example.com' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    vi.mocked(executeCommand)
      .mockResolvedValueOnce(err({ type: 'not_installed', message: 'agent-browser not found' }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('not_installed');
      }
    );
  });

  /**
   * FE-8: 実行時間が正しく記録される
   *
   * 前提条件: 複数ステップのフロー
   * 検証項目: FlowResult.duration と各 StepResult.duration が設定される
   */
  it('FE-8: 実行時間が正しく記録される', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'wait', ms: 1000 },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.duration).toBeGreaterThan(0);
        expect(flowResult.steps[0].duration).toBeGreaterThanOrEqual(0);
        expect(flowResult.steps[1].duration).toBeGreaterThanOrEqual(0);
      },
      () => { throw new Error('Expected ok result'); }
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
      steps: [
        { command: 'click', selector: 'NotExist' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      screenshot: false,
    };

    // 自動待機がタイムアウト
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.steps[0].error?.screenshot).toBeUndefined();
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-10: bail: true（デフォルト）の場合、最初の失敗で中断
   *
   * 前提条件: 3ステップのフロー、2ステップ目で失敗
   * 検証項目: 3ステップ目は実行されない
   */
  it('FE-10: bail: true の場合、最初の失敗で中断する', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'NotExist' },
        { command: 'click', selector: 'AnotherButton' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      bail: true,
    };

    // open コマンドのモック（成功）
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: {}, error: null }));

    // 自動待機用の snapshot のモック（要素が見つからずタイムアウト）
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}));

    // スクリーンショット撮影のモック
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"path":"/tmp/flow-error-123.png"},"error":null}'));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.error?.stepIndex).toBe(1);
        expect(flowResult.steps).toHaveLength(2); // 3ステップ目は実行されない
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[1].status).toBe('failed');
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * FE-11: bail: false の場合、失敗してもスキップして続行
   *
   * 前提条件: 3ステップのフロー、2ステップ目で失敗、bail: false
   * 検証項目: 全ステップが実行され、複数の失敗が記録される
   */
  it('FE-11: bail: false の場合、失敗してもスキップして続行する', async () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'NotExist' },
        { command: 'click', selector: 'AnotherNotExist' },
      ],
    };

    const options: FlowExecutionOptions = {
      sessionName: 'test-session',
      bail: false,
    };

    // open コマンドのモック（成功）
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: {}, error: null }));

    // 2ステップ目: 自動待機タイムアウト
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'))
      .mockResolvedValueOnce(ok('{"success":true,"data":{"path":"/tmp/flow-error-123.png"},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}));

    // 3ステップ目: 自動待機タイムアウト
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'))
      .mockResolvedValueOnce(ok('{"success":true,"data":{"path":"/tmp/flow-error-456.png"},"error":null}'));
    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}));

    // Act
    const result = await executeFlow(flow, options);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (flowResult) => {
        expect(flowResult.status).toBe('failed');
        expect(flowResult.error?.stepIndex).toBe(1); // 最初の失敗ステップ
        expect(flowResult.steps).toHaveLength(3); // 全ステップが実行される
        expect(flowResult.steps[0].status).toBe('passed');
        expect(flowResult.steps[1].status).toBe('failed');
        expect(flowResult.steps[2].status).toBe('failed');
      },
      () => { throw new Error('Expected ok result'); }
    );
  });
});
```

---

## 2. auto-wait.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| AW-1 | 要素が最初のsnapshotで見つかる | `ok("Element found")` |
| AW-2 | 要素が2回目のポーリングで見つかる | `ok("Element found")` |
| AW-3 | タイムアウトまで要素が見つからない | `err({ type: 'timeout' })` |
| AW-4 | セレクタが undefined の場合 | `ok("No selector to wait for")` |
| AW-5 | @e1 形式の参照IDが見つかる | `ok("Element found")` |
| AW-6 | snapshotのパースが失敗 | `err({ type: 'parse_error' })` |

### テストコード

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { autoWait } from '../auto-wait';
import type { ExecutionContext } from '../result';

vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
  parseSnapshotRefs: vi.fn(),
}));

import { executeCommand, parseJsonOutput, parseSnapshotRefs } from '@packages/agent-browser-adapter';

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
    // Arrange
    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { refs: { e1: { name: 'ログイン', role: 'button' } } }, error: null }));
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({ e1: { name: 'ログイン', role: 'button' } }));

    // Act
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (message) => expect(message).toContain('found'),
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * AW-2: 要素が2回目のポーリングで見つかる
   *
   * 前提条件: 1回目のsnapshotでは空、2回目で要素が出現
   * 検証項目: ok("Element found") が返される
   */
  it('AW-2: ポーリングで要素が見つかる場合、成功を返す', async () => {
    // Arrange
    // 1回目: 空
    vi.mocked(executeCommand)
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{}},"error":null}'))
      .mockResolvedValueOnce(ok('{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}'));

    vi.mocked(parseJsonOutput)
      .mockReturnValueOnce(ok({ success: true, data: { refs: {} }, error: null }))
      .mockReturnValueOnce(ok({ success: true, data: { refs: { e1: { name: 'ログイン', role: 'button' } } }, error: null }));

    vi.mocked(parseSnapshotRefs)
      .mockReturnValueOnce(ok({}))
      .mockReturnValueOnce(ok({ e1: { name: 'ログイン', role: 'button' } }));

    // Act
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * AW-3: タイムアウトまで要素が見つからない
   *
   * 前提条件: autoWaitTimeoutMs=1000、要素が出現しない
   * 検証項目: err({ type: 'timeout' }) が返される
   */
  it('AW-3: タイムアウトまで要素が見つからない場合、timeoutエラーを返す', async () => {
    // Arrange
    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"refs":{}},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({}));

    // Act
    const promise = autoWait('NotExist', mockContext);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('timeout');
        if (error.type === 'timeout') {
          expect(error.timeoutMs).toBe(1000);
        }
      }
    );
  });

  /**
   * AW-4: セレクタが undefined の場合
   *
   * 前提条件: selector が undefined
   * 検証項目: ok("No selector to wait for") が返される
   */
  it('AW-4: セレクタがundefinedの場合、スキップして成功を返す', async () => {
    // Act
    const result = await autoWait(undefined, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (message) => expect(message).toContain('No selector'),
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * AW-5: @e1 形式の参照IDが見つかる
   *
   * 前提条件: セレクタが "@e1"
   * 検証項目: refs["e1"] が存在すれば成功
   */
  it('AW-5: 参照ID形式のセレクタで要素が見つかる', async () => {
    // Arrange
    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"refs":{"e1":{"name":"ログイン","role":"button"}}},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { refs: { e1: { name: 'ログイン', role: 'button' } } }, error: null }));
    vi.mocked(parseSnapshotRefs).mockReturnValue(ok({ e1: { name: 'ログイン', role: 'button' } }));

    // Act
    const promise = autoWait('@e1', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert
    expect(result.isOk()).toBe(true);
  });

  /**
   * AW-6: snapshotのパースが失敗
   *
   * 前提条件: parseSnapshotRefs が err を返す
   * 検証項目: err({ type: 'parse_error' }) が返される
   */
  it('AW-6: snapshotのパースが失敗した場合、エラーを返す', async () => {
    // Arrange
    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"refs":{}},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { refs: {} }, error: null }));
    vi.mocked(parseSnapshotRefs).mockReturnValue(err({ type: 'parse_error', message: 'Invalid refs', rawOutput: '' }));

    // Act
    const promise = autoWait('ログイン', mockContext);
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('parse_error');
      }
    );
  });
});
```

---

## 3. commands/*.test.ts

各コマンドハンドラのテスト。

### 共通テストパターン

各コマンドハンドラは以下のパターンでテストします:

1. **成功ケース**: agent-browserが正常終了
2. **失敗ケース**: agent-browserがエラーを返す
3. **引数の検証**: 正しい引数でexecuteCommandが呼ばれる

### 3.1. navigation.test.ts

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { handleOpen } from '../../commands/navigation';
import type { OpenCommand } from '../../../types';
import type { ExecutionContext } from '../../result';

vi.mock('@packages/agent-browser-adapter', () => ({
  executeCommand: vi.fn(),
  parseJsonOutput: vi.fn(),
}));

import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';

describe('handleOpen', () => {
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
   * NAV-1: open コマンドが成功
   *
   * 前提条件: agent-browser open が成功
   * 検証項目: ok(CommandResult) が返される
   */
  it('NAV-1: openコマンドが成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: OpenCommand = {
      command: 'open',
      url: 'https://example.com',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"url":"https://example.com"},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { url: 'https://example.com' }, error: null }));

    // Act
    const result = await handleOpen(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (commandResult) => {
        expect(commandResult.stdout).toContain('success');
        expect(commandResult.duration).toBeGreaterThanOrEqual(0);
      },
      () => { throw new Error('Expected ok result'); }
    );

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'open',
      ['https://example.com', '--json'],
      mockContext.executeOptions
    );
  });

  /**
   * NAV-2: open コマンドが失敗
   *
   * 前提条件: agent-browser open が command_failed を返す
   * 検証項目: err(AgentBrowserError) が返される
   */
  it('NAV-2: openコマンドが失敗した場合、エラーを返す', async () => {
    // Arrange
    const command: OpenCommand = {
      command: 'open',
      url: 'https://invalid-url',
    };

    vi.mocked(executeCommand).mockResolvedValue(err({
      type: 'command_failed',
      command: 'open',
      args: ['https://invalid-url', '--json'],
      exitCode: 1,
      stderr: '',
      errorMessage: 'Invalid URL',
    }));

    // Act
    const result = await handleOpen(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('command_failed');
      }
    );
  });
});
```

### 3.2. interaction.test.ts

```typescript
describe('handleClick', () => {
  /**
   * INT-1: click コマンドが成功
   */
  it('INT-1: clickコマンドが成功した場合、CommandResultを返す', async () => {
    // テストロジック（NAV-1と同様のパターン）
  });

  /**
   * INT-2: click コマンドが失敗
   */
  it('INT-2: clickコマンドが失敗した場合、エラーを返す', async () => {
    // テストロジック
  });
});

describe('handleType', () => {
  /**
   * INT-3: type コマンドが成功
   */
  it('INT-3: typeコマンドが成功した場合、CommandResultを返す', async () => {
    // value フィールドが正しく渡されることを確認
  });
});

describe('handleFill', () => {
  /**
   * INT-4: fill コマンドが成功
   */
  it('INT-4: fillコマンドが成功した場合、CommandResultを返す', async () => {
    // value フィールドが正しく渡されることを確認
  });
});

describe('handlePress', () => {
  /**
   * INT-5: press コマンドが成功
   */
  it('INT-5: pressコマンドが成功した場合、CommandResultを返す', async () => {
    // key フィールドが正しく渡されることを確認
  });
});

describe('handleWait', () => {
  /**
   * WAIT-1: wait コマンドが成功（ms指定）
   */
  it('WAIT-1: waitコマンド（ms指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      ms: 1000,
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'wait',
      ['1000', '--json'],
      mockContext.executeOptions
    );
  });

  /**
   * WAIT-2: wait コマンドが成功（target指定）
   */
  it('WAIT-2: waitコマンド（target指定）が成功した場合、CommandResultを返す', async () => {
    // Arrange
    const command: WaitCommand = {
      command: 'wait',
      target: 'ログイン',
    };

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: {}, error: null }));

    // Act
    const result = await handleWait(command, mockContext);

    // Assert
    expect(result.isOk()).toBe(true);

    // executeCommand が正しい引数で呼ばれたか検証
    expect(executeCommand).toHaveBeenCalledWith(
      'wait',
      ['ログイン', '--json'],
      mockContext.executeOptions
    );
  });
});
```

### 3.3. assertions.test.ts

```typescript
describe('handleAssertVisible', () => {
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

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"visible":true},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { visible: true }, error: null }));

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

    vi.mocked(executeCommand).mockResolvedValue(ok('{"success":true,"data":{"visible":false},"error":null}'));
    vi.mocked(parseJsonOutput).mockReturnValue(ok({ success: true, data: { visible: false }, error: null }));

    // Act
    const result = await handleAssertVisible(command, mockContext);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('assertion_failed');
        expect(error.message).toContain('not visible');
      }
    );
  });
});

describe('handleAssertChecked', () => {
  /**
   * ASS-3: assertChecked が成功（checked === true）
   */
  it('ASS-3: チェックボックスがcheckedの場合、成功を返す', async () => {
    // checked: true がデフォルト
  });

  /**
   * ASS-4: assertChecked が成功（checked: false を期待）
   */
  it('ASS-4: checked: falseを期待する場合、正しく判定される', async () => {
    // command.checked = false
  });
});
```

---

## 4. env-expander.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| ENV-1 | 単一の環境変数を展開 | `${BASE_URL}` → `"https://example.com"` |
| ENV-2 | 複数の環境変数を展開 | 各変数が正しく置換される |
| ENV-3 | 存在しない変数は空文字列 | `${UNDEFINED}` → `""` |
| ENV-4 | 環境変数を含まない文字列 | そのまま |
| ENV-5 | 複数ステップで展開 | 各ステップが正しく展開される |

### テストコード

```typescript
import { describe, it, expect } from 'vitest';
import { expandEnvVars } from '../env-expander';
import type { Flow } from '../../types';

describe('expandEnvVars', () => {
  /**
   * ENV-1: 単一の環境変数を展開
   */
  it('ENV-1: 環境変数が正しく展開される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: '${BASE_URL}/login' },
      ],
    };

    const env = { BASE_URL: 'https://example.com' };

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    expect((result.steps[0] as any).url).toBe('https://example.com/login');
  });

  /**
   * ENV-2: 複数の環境変数を展開
   */
  it('ENV-2: 複数の環境変数が正しく展開される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: '${BASE_URL}/${PATH}' },
      ],
    };

    const env = { BASE_URL: 'https://example.com', PATH: 'login' };

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    expect((result.steps[0] as any).url).toBe('https://example.com/login');
  });

  /**
   * ENV-3: 存在しない変数は空文字列
   */
  it('ENV-3: 存在しない環境変数は空文字列に置換される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      steps: [
        { command: 'open', url: '${UNDEFINED}/path' },
      ],
    };

    const env = {};

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    expect((result.steps[0] as any).url).toBe('/path');
  });
});
```

---

## 受け入れ基準チェックリスト

Phase 3 完了時に以下を全て満たすこと:

### 機能要件

#### executeFlow

- [ ] **FE-1**: 全ステップが成功する単純なフローで `passed` を返す
- [ ] **FE-2**: ステップが失敗した場合、`failed` と `error.stepIndex` を返す
- [ ] **FE-3**: 環境変数が正しく展開される
- [ ] **FE-4**: 存在しない環境変数は空文字列になる
- [ ] **FE-5**: 失敗時にスクリーンショットが撮影される
- [ ] **FE-6**: 空のフローで `passed` を返す
- [ ] **FE-7**: agent-browser未インストール時にエラーを返す
- [ ] **FE-8**: 実行時間が正しく記録される
- [ ] **FE-9**: screenshot: false の場合、スクリーンショットを撮影しない
- [ ] **FE-10**: bail: true（デフォルト）の場合、最初の失敗で中断
- [ ] **FE-11**: bail: false の場合、失敗してもスキップして続行

#### 自動待機

- [ ] **AW-1**: 要素が最初のsnapshotで見つかる
- [ ] **AW-2**: 要素が2回目のポーリングで見つかる
- [ ] **AW-3**: タイムアウトまで要素が見つからない
- [ ] **AW-4**: セレクタが undefined の場合はスキップ
- [ ] **AW-5**: @e1 形式の参照IDが見つかる
- [ ] **AW-6**: snapshotのパースが失敗した場合にエラーを返す

#### コマンドハンドラ

- [ ] **NAV-1**: open コマンドが成功
- [ ] **NAV-2**: open コマンドが失敗
- [ ] **INT-1**: click コマンドが成功
- [ ] **INT-2**: click コマンドが失敗
- [ ] **INT-3**: type コマンドが成功
- [ ] **INT-4**: fill コマンドが成功
- [ ] **INT-5**: press コマンドが成功
- [ ] **WAIT-1**: wait コマンドが成功（ms指定）
- [ ] **WAIT-2**: wait コマンドが成功（target指定）
- [ ] **ASS-1**: assertVisible が成功（要素が visible）
- [ ] **ASS-2**: assertVisible が失敗（要素が invisible）
- [ ] **ASS-3**: assertChecked が成功（checked === true）
- [ ] **ASS-4**: assertChecked が成功（checked: false を期待）

#### 環境変数展開

- [ ] **ENV-1**: 単一の環境変数を展開
- [ ] **ENV-2**: 複数の環境変数を展開
- [ ] **ENV-3**: 存在しない変数は空文字列
- [ ] **ENV-4**: 環境変数を含まない文字列はそのまま
- [ ] **ENV-5**: 複数ステップで展開

### 品質要件

- [ ] 全テストが `pnpm run test` でパスする
- [ ] `pnpm run typecheck` でエラーがない
- [ ] `pnpm run lint` でエラーがない
- [ ] `pnpm run prepush` が成功する

### 公開API要件

- [ ] `API.md` に定義された全ての関数がexportされている
- [ ] `API.md` に定義された全ての型がexportされている
- [ ] 全ての戻り値が `Result` 型でラップされている

### コーディング規約

- [ ] neverthrow を正しく使用（match/map/andThen）
- [ ] fromThrowable のスコープは最小限
- [ ] 純粋関数を基本、副作用は最小限
- [ ] classは使用していない（または事前に承認済み）
- [ ] TSDocコメントが日本語で記載されている
