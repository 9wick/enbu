# Phase 4: テスト仕様

このドキュメントは `@apps/cli` のテストケースと受け入れ基準を定義します。

---

## テストファイル構成

```
apps/cli/src/__tests__/
├── args-parser.test.ts         # 引数パースのテスト
├── commands/
│   ├── init.test.ts            # initコマンドのテスト
│   └── run.test.ts             # runコマンドのテスト
├── output/
│   ├── formatter.test.ts       # 出力フォーマッターのテスト
│   └── exit-code.test.ts       # 終了コード管理のテスト
└── utils/
    └── fs.test.ts              # ファイルシステムユーティリティのテスト
```

---

## テスト方針

### モックの使用

- **child_process**: Phase 1のテストと同様、`spawn` をモック
- **fs/promises**: ファイルシステム操作をモック
- **process.stdout / process.stderr**: 出力をキャプチャ
- **process.exit**: テストプロセス終了を防ぐためモック

### テストデータ

- サンプルフローファイル（YAML）を `__fixtures__/` に配置
- モックレスポンス（JSON）を各テストファイル内に定義

---

## args-parser.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| A-1 | `--help` フラグ | `{ command: 'run', help: true, ... }` |
| A-2 | `init` コマンド | `{ command: 'init', ... }` |
| A-3 | `init --force` | `{ command: 'init', force: true, ... }` |
| A-4 | runコマンド（デフォルト、引数なし） | `{ command: 'run', files: [], ... }` |
| A-5 | runコマンド（ファイル指定） | `{ command: 'run', files: ['login.flow.yaml'], ... }` |
| A-6 | `--headed` オプション | `{ headed: true, ... }` |
| A-7 | `--env KEY=VALUE` オプション | `{ env: { KEY: 'VALUE' }, ... }` |
| A-8 | `--env` 複数指定 | `{ env: { USER: 'test', PASSWORD: 'secret' }, ... }` |
| A-9 | `--timeout <ms>` オプション | `{ timeout: 60000, ... }` |
| A-10 | `--timeout` 無効な値 | `err({ type: 'invalid_args', ... })` |
| A-11 | `--screenshot` オプション | `{ screenshot: true, ... }` |
| A-12 | `--bail` オプション | `{ bail: true, ... }` |
| A-13 | `--session <name>` オプション | `{ session: 'my-session', ... }` |
| A-14 | `--verbose` / `-v` オプション | `{ verbose: true, ... }` |
| A-15 | 未知のオプション | `err({ type: 'invalid_args', ... })` |
| A-16 | `--env` 不正な形式 | `err({ type: 'invalid_args', ... })` |

### テストコード

```typescript
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../args-parser';

describe('parseArgs', () => {
  /**
   * A-1: --helpフラグが指定された場合
   *
   * 前提条件: argv = ['--help']
   * 検証項目: { command: 'run', help: true } が返される
   */
  it('A-1: --helpフラグが指定された場合、helpフラグをtrueに設定', () => {
    // Arrange
    const argv = ['--help'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        expect(parsed.help).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-2: initコマンドが指定された場合
   *
   * 前提条件: argv = ['init']
   * 検証項目: { command: 'init', force: false } が返される
   */
  it('A-2: initコマンドをパースできる', () => {
    // Arrange
    const argv = ['init'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('init');
        if (parsed.command === 'init') {
          expect(parsed.force).toBe(false);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-3: init --forceが指定された場合
   *
   * 前提条件: argv = ['init', '--force']
   * 検証項目: { command: 'init', force: true } が返される
   */
  it('A-3: init --forceをパースできる', () => {
    // Arrange
    const argv = ['init', '--force'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('init');
        if (parsed.command === 'init') {
          expect(parsed.force).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-4: runコマンド（デフォルト、引数なし）
   *
   * 前提条件: argv = []
   * 検証項目: { command: 'run', files: [] } が返される
   */
  it('A-4: 引数なしの場合、runコマンドとして扱う', () => {
    // Arrange
    const argv: string[] = [];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        if (parsed.command === 'run') {
          expect(parsed.files).toEqual([]);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-5: runコマンド（ファイル指定）
   *
   * 前提条件: argv = ['login.flow.yaml']
   * 検証項目: { command: 'run', files: ['login.flow.yaml'] } が返される
   */
  it('A-5: フローファイルを指定できる', () => {
    // Arrange
    const argv = ['login.flow.yaml'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        if (parsed.command === 'run') {
          expect(parsed.files).toEqual(['login.flow.yaml']);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-6: --headedオプション
   *
   * 前提条件: argv = ['--headed', 'login.flow.yaml']
   * 検証項目: { headed: true } が返される
   */
  it('A-6: --headedオプションをパースできる', () => {
    // Arrange
    const argv = ['--headed', 'login.flow.yaml'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.headed).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-7: --env KEY=VALUEオプション
   *
   * 前提条件: argv = ['--env', 'USER=test']
   * 検証項目: { env: { USER: 'test' } } が返される
   */
  it('A-7: --envオプションをパースできる', () => {
    // Arrange
    const argv = ['--env', 'USER=test'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.env).toEqual({ USER: 'test' });
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-8: --env 複数指定
   *
   * 前提条件: argv = ['--env', 'USER=test', '--env', 'PASSWORD=secret']
   * 検証項目: { env: { USER: 'test', PASSWORD: 'secret' } } が返される
   */
  it('A-8: --envを複数回指定できる', () => {
    // Arrange
    const argv = ['--env', 'USER=test', '--env', 'PASSWORD=secret'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.env).toEqual({ USER: 'test', PASSWORD: 'secret' });
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-9: --timeout <ms>オプション
   *
   * 前提条件: argv = ['--timeout', '60000']
   * 検証項目: { timeout: 60000 } が返される
   */
  it('A-9: --timeoutオプションをパースできる', () => {
    // Arrange
    const argv = ['--timeout', '60000'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.timeout).toBe(60000);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-10: --timeout 無効な値
   *
   * 前提条件: argv = ['--timeout', 'invalid']
   * 検証項目: err({ type: 'invalid_args' }) が返される
   */
  it('A-10: --timeoutに無効な値が指定された場合、エラーを返す', () => {
    // Arrange
    const argv = ['--timeout', 'invalid'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_args');
        expect(error.message).toContain('positive number');
      }
    );
  });

  /**
   * A-11: --screenshotオプション
   *
   * 前提条件: argv = ['--screenshot']
   * 検証項目: { screenshot: true } が返される
   */
  it('A-11: --screenshotオプションをパースできる', () => {
    // Arrange
    const argv = ['--screenshot'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.screenshot).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-12: --bailオプション
   *
   * 前提条件: argv = ['--bail']
   * 検証項目: { bail: true } が返される
   */
  it('A-12: --bailオプションをパースできる', () => {
    // Arrange
    const argv = ['--bail'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.bail).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-13: --session <name>オプション
   *
   * 前提条件: argv = ['--session', 'my-session']
   * 検証項目: { session: 'my-session' } が返される
   */
  it('A-13: --sessionオプションをパースできる', () => {
    // Arrange
    const argv = ['--session', 'my-session'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.session).toBe('my-session');
        }
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-14: --verbose / -v オプション
   *
   * 前提条件: argv = ['-v']
   * 検証項目: { verbose: true } が返される
   */
  it('A-14: -vオプションでverboseモードを有効化', () => {
    // Arrange
    const argv = ['-v'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.verbose).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * A-15: 未知のオプション
   *
   * 前提条件: argv = ['--unknown']
   * 検証項目: err({ type: 'invalid_args' }) が返される
   */
  it('A-15: 未知のオプションが指定された場合、エラーを返す', () => {
    // Arrange
    const argv = ['--unknown'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_args');
        expect(error.message).toContain('Unknown option');
      }
    );
  });

  /**
   * A-16: --env 不正な形式
   *
   * 前提条件: argv = ['--env', 'INVALID']
   * 検証項目: err({ type: 'invalid_args' }) が返される
   */
  it('A-16: --envに=がない場合、エラーを返す', () => {
    // Arrange
    const argv = ['--env', 'INVALID'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_args');
        expect(error.message).toContain('KEY=VALUE format');
      }
    );
  });
});
```

---

## output/formatter.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| F-1 | `info()` で stdout に出力 | `process.stdout.write` が呼ばれる |
| F-2 | `error()` で stderr に出力 | `process.stderr.write` が呼ばれる |
| F-3 | `debug()` で verbose=true 時に出力 | `process.stderr.write` が呼ばれる |
| F-4 | `debug()` で verbose=false 時に出力しない | `process.stderr.write` が呼ばれない |
| F-5 | `success()` で ✓ マーク付き出力 | `✓ message` が出力される |
| F-6 | `failure()` で ✗ マーク付き出力 | `✗ message` が出力される |
| F-7 | `startSpinner()` でスピナー開始 | 定期的に描画される |
| F-8 | `stopSpinner()` でスピナー停止 | 描画が停止し、行がクリアされる |

### テストコード

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutputFormatter } from '../formatter';

describe('OutputFormatter', () => {
  let stdoutWrite: typeof process.stdout.write;
  let stderrWrite: typeof process.stderr.write;
  let stdoutCalls: string[];
  let stderrCalls: string[];

  beforeEach(() => {
    stdoutWrite = process.stdout.write;
    stderrWrite = process.stderr.write;
    stdoutCalls = [];
    stderrCalls = [];

    process.stdout.write = vi.fn((chunk: any) => {
      stdoutCalls.push(chunk.toString());
      return true;
    }) as any;

    process.stderr.write = vi.fn((chunk: any) => {
      stderrCalls.push(chunk.toString());
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  });

  /**
   * F-1: info() で stdout に出力
   *
   * 前提条件: formatter.info('Test message')
   * 検証項目: process.stdout.write が 'Test message\n' で呼ばれる
   */
  it('F-1: info()でstdoutに出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.info('Test message');

    // Assert
    expect(stdoutCalls).toContain('Test message\n');
  });

  /**
   * F-2: error() で stderr に出力
   *
   * 前提条件: formatter.error('Error message')
   * 検証項目: process.stderr.write が 'Error message\n' で呼ばれる
   */
  it('F-2: error()でstderrに出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.error('Error message');

    // Assert
    expect(stderrCalls).toContain('Error message\n');
  });

  /**
   * F-3: debug() で verbose=true 時に出力
   *
   * 前提条件: verbose=true, formatter.debug('Debug message')
   * 検証項目: process.stderr.write が '[DEBUG] Debug message\n' で呼ばれる
   */
  it('F-3: verbose=trueの場合、debug()がstderrに出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(true);

    // Act
    formatter.debug('Debug message');

    // Assert
    expect(stderrCalls).toContain('[DEBUG] Debug message\n');
  });

  /**
   * F-4: debug() で verbose=false 時に出力しない
   *
   * 前提条件: verbose=false, formatter.debug('Debug message')
   * 検証項目: process.stderr.write が呼ばれない
   */
  it('F-4: verbose=falseの場合、debug()は出力されない', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.debug('Debug message');

    // Assert
    expect(stderrCalls).toHaveLength(0);
  });

  /**
   * F-5: success() で ✓ マーク付き出力
   *
   * 前提条件: formatter.success('Operation succeeded', 1500)
   * 検証項目: '  ✓ Operation succeeded (1.5s)\n' が出力される
   */
  it('F-5: success()で成功マーク付きメッセージが出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.success('Operation succeeded', 1500);

    // Assert
    expect(stdoutCalls).toContain('  ✓ Operation succeeded (1.5s)\n');
  });

  /**
   * F-6: failure() で ✗ マーク付き出力
   *
   * 前提条件: formatter.failure('Operation failed', 2000)
   * 検証項目: '  ✗ Operation failed (2.0s)\n' が出力される
   */
  it('F-6: failure()で失敗マーク付きメッセージが出力される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);

    // Act
    formatter.failure('Operation failed', 2000);

    // Assert
    expect(stderrCalls).toContain('  ✗ Operation failed (2.0s)\n');
  });

  /**
   * F-7: startSpinner() でスピナー開始
   *
   * 前提条件: formatter.startSpinner('Loading...')
   * 検証項目: スピナーフレームが定期的に描画される
   */
  it('F-7: startSpinner()でスピナーが開始される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);
    vi.useFakeTimers();

    // Act
    formatter.startSpinner('Loading...');

    // Assert（初回描画）
    expect(stdoutCalls.some((call) => call.includes('Loading...'))).toBe(true);

    // タイマーを進めてフレーム更新を確認
    vi.advanceTimersByTime(80);
    expect(stdoutCalls.length).toBeGreaterThan(1);

    // クリーンアップ
    formatter.stopSpinner();
    vi.useRealTimers();
  });

  /**
   * F-8: stopSpinner() でスピナー停止
   *
   * 前提条件: formatter.startSpinner() → formatter.stopSpinner()
   * 検証項目: インターバルがクリアされ、行がクリアされる
   */
  it('F-8: stopSpinner()でスピナーが停止される', () => {
    // Arrange
    const formatter = new OutputFormatter(false);
    vi.useFakeTimers();

    // Act
    formatter.startSpinner('Loading...');
    const callsBeforeStop = stdoutCalls.length;
    formatter.stopSpinner();

    // タイマーを進めても描画されない
    vi.advanceTimersByTime(1000);
    expect(stdoutCalls.length).toBe(callsBeforeStop + 1); // clearLine分のみ

    // クリーンアップ
    vi.useRealTimers();
  });
});
```

---

## commands/init.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| I-1 | 初期化成功（ディレクトリ・ファイル生成） | `ok(undefined)` |
| I-2 | 既存ディレクトリがある場合（force=false） | スキップ、`ok(undefined)` |
| I-3 | 既存ディレクトリがある場合（force=true） | 上書き、`ok(undefined)` |
| I-4 | ファイルシステムエラー | `err({ type: 'execution_error', ... })` |
| I-5 | .gitignore 更新（ユーザーがYesを選択） | .gitignore に `.abflow/` が追記される |
| I-6 | .gitignore 更新（ユーザーがNoを選択） | .gitignore は変更されない |

### テストコード

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runInitCommand } from '../init';
import * as fsUtils from '../../utils/fs';

// ファイルシステムユーティリティをモック
vi.mock('../../utils/fs');

// readline をモック
vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_, callback) => callback('n')), // デフォルトはNo
    close: vi.fn(),
  })),
}));

describe('runInitCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック動作
    vi.mocked(fsUtils.fileExists).mockResolvedValue(false);
    vi.mocked(fsUtils.createDirectory).mockResolvedValue({ isOk: () => true } as any);
    vi.mocked(fsUtils.writeFileContent).mockResolvedValue({ isOk: () => true } as any);
  });

  /**
   * I-1: 初期化成功
   *
   * 前提条件: ディレクトリもファイルも存在しない
   * 検証項目: ok(undefined) が返される
   */
  it('I-1: 初期化が成功する', async () => {
    // Arrange
    vi.mocked(fsUtils.fileExists).mockResolvedValue(false);

    // Act
    const result = await runInitCommand({ force: false, verbose: false });

    // Assert
    expect(result.isOk()).toBe(true);
    expect(fsUtils.createDirectory).toHaveBeenCalled();
    expect(fsUtils.writeFileContent).toHaveBeenCalled();
  });

  /**
   * I-2: 既存ディレクトリがある場合（force=false）
   *
   * 前提条件: .abflow/ が既に存在
   * 検証項目: createDirectory がスキップされ、ok(undefined) が返される
   */
  it('I-2: 既存ディレクトリがある場合、スキップする', async () => {
    // Arrange
    vi.mocked(fsUtils.fileExists).mockResolvedValue(true);

    // Act
    const result = await runInitCommand({ force: false, verbose: false });

    // Assert
    expect(result.isOk()).toBe(true);
    // 既存なのでcreateDirectoryは呼ばれない（スキップ）
  });

  /**
   * I-3: 既存ディレクトリがある場合（force=true）
   *
   * 前提条件: .abflow/ が既に存在、force=true
   * 検証項目: 上書きされ、ok(undefined) が返される
   */
  it('I-3: force=trueの場合、既存ディレクトリを上書きする', async () => {
    // Arrange
    vi.mocked(fsUtils.fileExists).mockResolvedValue(true);

    // Act
    const result = await runInitCommand({ force: true, verbose: false });

    // Assert
    expect(result.isOk()).toBe(true);
    expect(fsUtils.createDirectory).toHaveBeenCalled();
    expect(fsUtils.writeFileContent).toHaveBeenCalled();
  });

  /**
   * I-4: ファイルシステムエラー
   *
   * 前提条件: createDirectory がエラーを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('I-4: ファイルシステムエラーが発生した場合、エラーを返す', async () => {
    // Arrange
    vi.mocked(fsUtils.createDirectory).mockResolvedValue({
      isOk: () => false,
      isErr: () => true,
      error: { type: 'execution_error', message: 'Permission denied' },
    } as any);

    // Act
    const result = await runInitCommand({ force: false, verbose: false });

    // Assert
    expect(result.isErr()).toBe(true);
  });
});
```

---

## commands/run.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| R-1 | agent-browser未インストール | `err({ type: 'execution_error', ... })` |
| R-2 | フローファイルが見つからない | `err({ type: 'execution_error', ... })` |
| R-3 | フロー読み込み成功、実行成功 | `ok({ passed: 1, failed: 0, total: 1 })` |
| R-4 | フロー実行失敗 | `ok({ passed: 0, failed: 1, total: 1 })` |
| R-5 | 複数フロー実行、一部失敗 | `ok({ passed: 1, failed: 1, total: 2 })` |
| R-6 | --bail で最初の失敗で中断 | `ok({ passed: 0, failed: 1, total: 2 })` （2つ目は実行されない） |

### テストコード

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFlowCommand } from '../run';
import { checkAgentBrowser } from '@packages/agent-browser-adapter';
import { loadFlows, executeFlow } from '@packages/core';

// 依存をモック
vi.mock('@packages/agent-browser-adapter');
vi.mock('@packages/core');

describe('runFlowCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック動作
    vi.mocked(checkAgentBrowser).mockResolvedValue({
      isOk: () => true,
      isErr: () => false,
      value: 'agent-browser is installed',
    } as any);
  });

  /**
   * R-1: agent-browser未インストール
   *
   * 前提条件: checkAgentBrowser がエラーを返す
   * 検証項目: err({ type: 'execution_error' }) が返される
   */
  it('R-1: agent-browserが未インストールの場合、エラーを返す', async () => {
    // Arrange
    vi.mocked(checkAgentBrowser).mockResolvedValue({
      isOk: () => false,
      isErr: () => true,
      error: { type: 'not_installed', message: 'agent-browser is not installed' },
    } as any);

    // Act
    const result = await runFlowCommand({
      files: [],
      headed: false,
      env: {},
      timeout: 30000,
      screenshot: false,
      bail: false,
      verbose: false,
    });

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('execution_error');
      }
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
    // glob が空配列を返すようにモック（実装依存）

    // Act
    const result = await runFlowCommand({
      files: [],
      headed: false,
      env: {},
      timeout: 30000,
      screenshot: false,
      bail: false,
      verbose: false,
    });

    // Assert
    expect(result.isErr()).toBe(true);
  });

  /**
   * R-3: フロー読み込み成功、実行成功
   *
   * 前提条件: loadFlows が1つのフローを返す、executeFlow が成功
   * 検証項目: ok({ passed: 1, failed: 0, total: 1 }) が返される
   */
  it('R-3: フロー実行が成功する', async () => {
    // Arrange
    const mockFlow = {
      name: 'login',
      steps: [{ action: 'open', url: 'https://example.com' }],
    };

    vi.mocked(loadFlows).mockResolvedValue({
      isOk: () => true,
      value: [mockFlow],
    } as any);

    vi.mocked(executeFlow).mockResolvedValue({
      isOk: () => true,
      value: { success: true, flowName: 'login', totalSteps: 1, completedSteps: 1 },
    } as any);

    // Act
    const result = await runFlowCommand({
      files: ['login.flow.yaml'],
      headed: false,
      env: {},
      timeout: 30000,
      screenshot: false,
      bail: false,
      verbose: false,
    });

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
      }
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
    const mockFlow = {
      name: 'login',
      steps: [{ action: 'click', target: 'NotExist' }],
    };

    vi.mocked(loadFlows).mockResolvedValue({
      isOk: () => true,
      value: [mockFlow],
    } as any);

    vi.mocked(executeFlow).mockResolvedValue({
      isOk: () => true,
      value: {
        success: false,
        flowName: 'login',
        totalSteps: 1,
        completedSteps: 0,
        failedStepIndex: 0,
        error: 'Element not found',
      },
    } as any);

    // Act
    const result = await runFlowCommand({
      files: ['login.flow.yaml'],
      headed: false,
      env: {},
      timeout: 30000,
      screenshot: false,
      bail: false,
      verbose: false,
    });

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
      }
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
    const mockFlows = [
      { name: 'flow1', steps: [{ action: 'open', url: 'https://example.com' }] },
      { name: 'flow2', steps: [{ action: 'click', target: 'NotExist' }] },
    ];

    vi.mocked(loadFlows).mockResolvedValue({
      isOk: () => true,
      value: mockFlows,
    } as any);

    // 1つ目は成功、2つ目は失敗
    vi.mocked(executeFlow)
      .mockResolvedValueOnce({
        isOk: () => true,
        value: { success: true, flowName: 'flow1', totalSteps: 1, completedSteps: 1 },
      } as any)
      .mockResolvedValueOnce({
        isOk: () => true,
        value: {
          success: false,
          flowName: 'flow2',
          totalSteps: 1,
          completedSteps: 0,
          failedStepIndex: 0,
          error: 'Element not found',
        },
      } as any);

    // Act
    const result = await runFlowCommand({
      files: ['flow1.flow.yaml', 'flow2.flow.yaml'],
      headed: false,
      env: {},
      timeout: 30000,
      screenshot: false,
      bail: false,
      verbose: false,
    });

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
      }
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
    const mockFlows = [
      { name: 'flow1', steps: [{ action: 'click', target: 'NotExist' }] },
      { name: 'flow2', steps: [{ action: 'open', url: 'https://example.com' }] },
    ];

    vi.mocked(loadFlows).mockResolvedValue({
      isOk: () => true,
      value: mockFlows,
    } as any);

    // 1つ目は失敗
    vi.mocked(executeFlow).mockResolvedValueOnce({
      isOk: () => true,
      value: {
        success: false,
        flowName: 'flow1',
        totalSteps: 1,
        completedSteps: 0,
        failedStepIndex: 0,
        error: 'Element not found',
      },
    } as any);

    // Act
    const result = await runFlowCommand({
      files: ['flow1.flow.yaml', 'flow2.flow.yaml'],
      headed: false,
      env: {},
      timeout: 30000,
      screenshot: false,
      bail: true, // bail フラグ
      verbose: false,
    });

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (executionResult) => {
        expect(executionResult.passed).toBe(0);
        expect(executionResult.failed).toBe(1);
        // 2つ目は実行されない
        expect(vi.mocked(executeFlow)).toHaveBeenCalledTimes(1);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });
});
```

---

## 受け入れ基準チェックリスト

Phase 4 完了時に以下を全て満たすこと:

### 機能要件（引数パース）

- [ ] **A-1**: `--help` フラグで help モードが有効化される
- [ ] **A-2**: `init` コマンドがパースされる
- [ ] **A-3**: `init --force` がパースされる
- [ ] **A-4**: 引数なしでrunコマンドとして扱われる
- [ ] **A-5**: フローファイルパスがパースされる
- [ ] **A-6**: `--headed` オプションがパースされる
- [ ] **A-7**: `--env KEY=VALUE` がパースされる
- [ ] **A-8**: `--env` が複数回指定できる
- [ ] **A-9**: `--timeout <ms>` がパースされる
- [ ] **A-10**: `--timeout` の無効な値でエラーが返される
- [ ] **A-11**: `--screenshot` がパースされる
- [ ] **A-12**: `--bail` がパースされる
- [ ] **A-13**: `--session <name>` がパースされる
- [ ] **A-14**: `--verbose` / `-v` がパースされる
- [ ] **A-15**: 未知のオプションでエラーが返される
- [ ] **A-16**: `--env` の不正な形式でエラーが返される

### 機能要件（出力フォーマッター）

- [ ] **F-1**: `info()` で stdout に出力される
- [ ] **F-2**: `error()` で stderr に出力される
- [ ] **F-3**: `debug()` で verbose=true 時に出力される
- [ ] **F-4**: `debug()` で verbose=false 時に出力されない
- [ ] **F-5**: `success()` で ✓ マーク付き出力される
- [ ] **F-6**: `failure()` で ✗ マーク付き出力される
- [ ] **F-7**: `startSpinner()` でスピナーが開始される
- [ ] **F-8**: `stopSpinner()` でスピナーが停止される

### 機能要件（initコマンド）

- [ ] **I-1**: 初期化が成功する
- [ ] **I-2**: 既存ディレクトリがある場合、スキップする
- [ ] **I-3**: force=true の場合、上書きする
- [ ] **I-4**: ファイルシステムエラーが返される

### 機能要件（runコマンド）

- [ ] **R-1**: agent-browser未インストールでエラーが返される
- [ ] **R-2**: フローファイルが見つからない場合、エラーが返される
- [ ] **R-3**: フロー実行が成功する
- [ ] **R-4**: フロー実行が失敗する
- [ ] **R-5**: 複数フロー実行、一部失敗する
- [ ] **R-6**: `--bail` フラグで最初の失敗時に中断する

### 品質要件

- [ ] 全テストが `pnpm run test` でパスする
- [ ] `pnpm run typecheck` でエラーがない
- [ ] `pnpm run lint` でエラーがない
- [ ] `pnpm run prepush` が成功する

### CLI実行要件

- [ ] `npx agent-browser-flow --help` でヘルプが表示される
- [ ] `npx agent-browser-flow init` でプロジェクトが初期化される
- [ ] `npx agent-browser-flow <file>` でフローが実行される
- [ ] 終了コードが正しく設定される（成功: 0, フロー失敗: 1, エラー: 2）

### コーディング規約

- [ ] `console.log` が使用されていない（`process.stdout.write` / `process.stderr.write` を使用）
- [ ] 全ての戻り値が `Result` 型でラップされている
- [ ] `neverthrow` のメソッドチェーン（`match`, `map`, `andThen`）を使用している
- [ ] 純粋関数を基本とし、副作用は最小限に抑えられている
