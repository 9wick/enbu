# Phase 1: テスト仕様

このドキュメントは `@packages/agent-browser-adapter` のテストケースと受け入れ基準を定義します。

---

## テストファイル構成

```
packages/agent-browser-adapter/src/__tests__/
├── check.test.ts         # checkAgentBrowser のテスト
├── executor.test.ts      # executeCommand のテスト
└── parser.test.ts        # parseJsonOutput, parseSnapshotRefs のテスト
```

---

## テスト方針

### モックの使用

- `child_process.spawn` をモックして、実際の agent-browser は呼び出さない
- 各テストケースで期待する出力を直接設定

### モックの実装例

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

// spawn のモック
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

/**
 * モックプロセスを作成するヘルパー
 */
const createMockProcess = (options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: Error;
}): ChildProcess => {
  const proc = new EventEmitter() as ChildProcess;

  // stdout/stderr のモック
  proc.stdout = new EventEmitter() as any;
  proc.stderr = new EventEmitter() as any;

  // 非同期で結果を発行
  setTimeout(() => {
    if (options.error) {
      proc.emit('error', options.error);
      return;
    }

    if (options.stdout) {
      proc.stdout?.emit('data', Buffer.from(options.stdout));
    }
    if (options.stderr) {
      proc.stderr?.emit('data', Buffer.from(options.stderr));
    }
    proc.emit('close', options.exitCode ?? 0);
  }, 0);

  return proc;
};
```

---

## check.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| C-1 | agent-browserがインストールされている | `ok("agent-browser is installed")` |
| C-2 | agent-browserがインストールされていない（ENOENT） | `err({ type: 'not_installed', ... })` |
| C-3 | agent-browserがエラー終了（exitCode !== 0） | `err({ type: 'not_installed', ... })` |

### テストコード

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import { checkAgentBrowser } from '../check';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('checkAgentBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * C-1: agent-browserがインストールされている場合
   *
   * 前提条件: agent-browser --help が exitCode 0 で終了
   * 検証項目: ok("agent-browser is installed") が返される
   */
  it('C-1: agent-browserがインストールされている場合、成功メッセージを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const result = await checkAgentBrowser();

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (message) => expect(message).toBe('agent-browser is installed'),
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * C-2: agent-browserがインストールされていない場合（ENOENT）
   *
   * 前提条件: spawn が ENOENT エラーを発行
   * 検証項目: err({ type: 'not_installed', ... }) が返される
   */
  it('C-2: ENOENTエラーの場合、not_installedエラーを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({
      error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }),
    });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const result = await checkAgentBrowser();

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('not_installed');
        expect(error.message).toContain('not installed');
      }
    );
  });

  /**
   * C-3: agent-browserがエラー終了した場合
   *
   * 前提条件: agent-browser --help が exitCode 1 で終了
   * 検証項目: err({ type: 'not_installed', ... }) が返される
   */
  it('C-3: exitCode !== 0 の場合、not_installedエラーを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 1 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const result = await checkAgentBrowser();

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('not_installed');
        expect(error.message).toContain('exit code 1');
      }
    );
  });
});
```

---

## executor.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| E-1 | コマンド実行成功 | `ok(stdout)` |
| E-2 | コマンド実行失敗（exitCode !== 0） | `err({ type: 'command_failed', ... })` |
| E-3 | タイムアウト | `err({ type: 'timeout', ... })` |
| E-4 | sessionName オプションが正しく渡される | `--session` 引数が含まれる |
| E-5 | headed オプションが正しく渡される | `--headed` 引数が含まれる |
| E-6 | 複数の引数が正しく渡される | 全ての引数が順序通り |

### テストコード

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import { executeCommand } from '../executor';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('executeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * E-1: コマンド実行成功
   *
   * 前提条件: agent-browser open https://example.com --json が exitCode 0 で終了
   * 検証項目: ok(stdout) が返される
   */
  it('E-1: コマンド実行が成功した場合、stdoutを返す', async () => {
    // Arrange
    const expectedOutput = '{"success":true,"data":{"url":"https://example.com"},"error":null}';
    const mockProc = createMockProcess({
      stdout: expectedOutput,
      exitCode: 0,
    });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com', '--json']);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (stdout) => expect(stdout).toBe(expectedOutput),
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * E-2: コマンド実行失敗
   *
   * 前提条件: agent-browser click "NotExist" が exitCode 1 で終了
   * 検証項目: err({ type: 'command_failed', ... }) が返される
   */
  it('E-2: exitCode !== 0 の場合、command_failedエラーを返す', async () => {
    // Arrange
    const errorOutput = '{"success":false,"data":null,"error":"Element not found"}';
    const mockProc = createMockProcess({
      stdout: errorOutput,
      exitCode: 1,
    });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('click', ['NotExist', '--json']);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('command_failed');
        if (error.type === 'command_failed') {
          expect(error.command).toBe('click');
          expect(error.args).toEqual(['NotExist', '--json']);
          expect(error.exitCode).toBe(1);
          expect(error.errorMessage).toBe('Element not found');
        }
      }
    );
  });

  /**
   * E-3: タイムアウト
   *
   * 前提条件: コマンドがtimeoutMs以内に完了しない
   * 検証項目: err({ type: 'timeout', ... }) が返される
   */
  it('E-3: タイムアウトした場合、timeoutエラーを返す', async () => {
    // Arrange
    const mockProc = createMockProcess({}); // 完了しない
    // close イベントを発行しないように上書き
    mockProc.emit = vi.fn().mockReturnValue(true);
    mockProc.kill = vi.fn();
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://slow.example.com'], {
      timeoutMs: 1000,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

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
    expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
  });

  /**
   * E-4: sessionName オプション
   *
   * 前提条件: sessionName: 'my-session' を指定
   * 検証項目: spawn に '--session my-session' が渡される
   */
  it('E-4: sessionNameオプションが正しく渡される', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com'], {
      sessionName: 'my-session',
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Assert
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--session', 'my-session']),
      expect.any(Object)
    );
  });

  /**
   * E-5: headed オプション
   *
   * 前提条件: headed: true を指定
   * 検証項目: spawn に '--headed' が渡される
   */
  it('E-5: headedオプションが正しく渡される', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com'], {
      headed: true,
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Assert
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--headed']),
      expect.any(Object)
    );
  });

  /**
   * E-6: 引数の順序
   *
   * 前提条件: command='open', args=['url', '--json'], sessionName='sess', headed=true
   * 検証項目: 'agent-browser open url --json --session sess --headed' の順序
   */
  it('E-6: 引数が正しい順序で渡される', async () => {
    // Arrange
    const mockProc = createMockProcess({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(mockProc);

    // Act
    const resultPromise = executeCommand('open', ['https://example.com', '--json'], {
      sessionName: 'sess',
      headed: true,
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Assert
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toEqual([
      'agent-browser',
      'open',
      'https://example.com',
      '--json',
      '--session',
      'sess',
      '--headed',
    ]);
  });
});
```

---

## parser.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| P-1 | 有効なJSON出力のパース | `ok(parsedObject)` |
| P-2 | 無効なJSON（構文エラー） | `err({ type: 'parse_error', ... })` |
| P-3 | 構造が不正なJSON | `err({ type: 'parse_error', ... })` |
| P-4 | snapshot refs のパース成功 | `ok(refs)` |
| P-5 | snapshot 失敗レスポンスのパース | `err({ type: 'parse_error', ... })` |
| P-6 | refs が存在しない snapshot | `err({ type: 'parse_error', ... })` |

### テストコード

```typescript
import { describe, it, expect } from 'vitest';
import { parseJsonOutput, parseSnapshotRefs } from '../parser';

describe('parseJsonOutput', () => {
  /**
   * P-1: 有効なJSON出力のパース
   *
   * 前提条件: 正しいJSON文字列
   * 検証項目: パース済みオブジェクトが返される
   */
  it('P-1: 有効なJSONをパースできる', () => {
    // Arrange
    const input = '{"success":true,"data":{"url":"https://example.com"},"error":null}';

    // Act
    const result = parseJsonOutput<{ url: string }>(input);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (output) => {
        expect(output.success).toBe(true);
        expect(output.data?.url).toBe('https://example.com');
        expect(output.error).toBeNull();
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * P-2: 無効なJSON
   *
   * 前提条件: 構文エラーのある文字列
   * 検証項目: parse_errorエラーが返される
   */
  it('P-2: 無効なJSONでparse_errorを返す', () => {
    // Arrange
    const input = 'not valid json {{{';

    // Act
    const result = parseJsonOutput(input);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.rawOutput).toBe(input);
        }
      }
    );
  });

  /**
   * P-3: 構造が不正なJSON
   *
   * 前提条件: success/data/error フィールドがない
   * 検証項目: parse_errorエラーが返される
   */
  it('P-3: 必須フィールドがない場合、parse_errorを返す', () => {
    // Arrange
    const input = '{"result":"ok"}'; // success, data, error がない

    // Act
    const result = parseJsonOutput(input);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.message).toContain('Invalid JSON structure');
        }
      }
    );
  });
});

describe('parseSnapshotRefs', () => {
  /**
   * P-4: snapshot refs のパース成功
   *
   * 前提条件: success=true, data.refs が存在
   * 検証項目: SnapshotRefs が返される
   */
  it('P-4: 有効なsnapshot出力からrefsを抽出できる', () => {
    // Arrange
    const jsonOutput = {
      success: true,
      data: {
        refs: {
          e1: { name: 'ログインボタン', role: 'button' },
          e2: { name: 'メールアドレス', role: 'textbox' },
        },
        snapshot: '...',
      },
      error: null,
    };

    // Act
    const result = parseSnapshotRefs(jsonOutput);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (refs) => {
        expect(refs['e1']).toEqual({ name: 'ログインボタン', role: 'button' });
        expect(refs['e2']).toEqual({ name: 'メールアドレス', role: 'textbox' });
      },
      () => { throw new Error('Expected ok result'); }
    );
  });

  /**
   * P-5: snapshot 失敗レスポンス
   *
   * 前提条件: success=false
   * 検証項目: parse_errorエラーが返される
   */
  it('P-5: success=falseの場合、parse_errorを返す', () => {
    // Arrange
    const jsonOutput = {
      success: false,
      data: null,
      error: 'No page open',
    };

    // Act
    const result = parseSnapshotRefs(jsonOutput);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.message).toContain('Snapshot failed');
        }
      }
    );
  });

  /**
   * P-6: refs が存在しない
   *
   * 前提条件: success=true だが data.refs がない
   * 検証項目: parse_errorエラーが返される
   */
  it('P-6: refsがない場合、parse_errorを返す', () => {
    // Arrange
    const jsonOutput = {
      success: true,
      data: {
        snapshot: '...',
        // refs がない
      },
      error: null,
    };

    // Act
    const result = parseSnapshotRefs(jsonOutput);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => { throw new Error('Expected err result'); },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.message).toContain('missing refs');
        }
      }
    );
  });
});
```

---

## 受け入れ基準チェックリスト

Phase 1 完了時に以下を全て満たすこと:

### 機能要件

- [ ] **C-1**: `checkAgentBrowser()` がインストール済みの場合に成功を返す
- [ ] **C-2**: `checkAgentBrowser()` がENOENTで `not_installed` エラーを返す
- [ ] **C-3**: `checkAgentBrowser()` がexitCode !== 0 で `not_installed` エラーを返す
- [ ] **E-1**: `executeCommand()` が成功時に stdout を返す
- [ ] **E-2**: `executeCommand()` が失敗時に `command_failed` エラーを返す
- [ ] **E-3**: `executeCommand()` がタイムアウト時に `timeout` エラーを返す
- [ ] **E-4**: `executeCommand()` が `sessionName` オプションを正しく渡す
- [ ] **E-5**: `executeCommand()` が `headed` オプションを正しく渡す
- [ ] **E-6**: `executeCommand()` が引数を正しい順序で渡す
- [ ] **P-1**: `parseJsonOutput()` が有効なJSONをパースできる
- [ ] **P-2**: `parseJsonOutput()` が無効なJSONで `parse_error` を返す
- [ ] **P-3**: `parseJsonOutput()` が不正な構造で `parse_error` を返す
- [ ] **P-4**: `parseSnapshotRefs()` が refs を正しく抽出できる
- [ ] **P-5**: `parseSnapshotRefs()` が失敗レスポンスでエラーを返す
- [ ] **P-6**: `parseSnapshotRefs()` が refs 不在でエラーを返す

### 品質要件

- [ ] 全テストが `pnpm run test` でパスする
- [ ] `pnpm run typecheck` でエラーがない
- [ ] `pnpm run lint` でエラーがない
- [ ] `pnpm run prepush` が成功する

### 公開API要件

- [ ] `API.md` に定義された全ての関数がexportされている
- [ ] `API.md` に定義された全ての型がexportされている
- [ ] 全ての戻り値が `Result` 型でラップされている
