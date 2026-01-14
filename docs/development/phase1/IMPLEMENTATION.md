# Phase 1: 実装ガイド

このドキュメントは `@packages/agent-browser-adapter` の実装詳細を説明します。

---

## ファイル構成

```
packages/agent-browser-adapter/src/
├── index.ts              # 公開APIのre-export
├── types.ts              # 型定義
├── check.ts              # checkAgentBrowser関数
├── executor.ts           # executeCommand関数
└── parser.ts             # parseJsonOutput, parseSnapshotRefs関数
```

---

## 1. types.ts

全ての型を一箇所で定義します。

```typescript
/**
 * agent-browser-adapter の型定義
 *
 * このファイルで定義される型は全て外部に公開される。
 * 内部でのみ使う型は各ファイル内で定義すること。
 */

/**
 * agent-browserのエラー型
 */
export type AgentBrowserError =
  | {
      type: 'not_installed';
      message: string;
    }
  | {
      type: 'command_failed';
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      errorMessage: string | null;
    }
  | {
      type: 'timeout';
      command: string;
      args: readonly string[];
      timeoutMs: number;
    }
  | {
      type: 'parse_error';
      message: string;
      rawOutput: string;
    };

/**
 * agent-browserの--json出力の共通構造
 */
export type AgentBrowserJsonOutput<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

/**
 * executeCommand のオプション
 */
export type ExecuteOptions = {
  sessionName?: string;
  headed?: boolean;
  timeoutMs?: number;
  cwd?: string;
};

/**
 * snapshot出力の要素参照
 */
export type SnapshotRef = {
  name: string;
  role: string;
};

/**
 * snapshot出力の参照マップ
 */
export type SnapshotRefs = Record<string, SnapshotRef>;
```

---

## 2. check.ts

agent-browserのインストール確認を実装します。

### 実装方針

1. `agent-browser --help` を実行（`--version`は未対応のため）
2. spawn で実行し、exitCode を確認
3. ENOENT エラーは「インストールされていない」として扱う

### コード構造

```typescript
import { spawn } from 'node:child_process';
import { Result, ok, err } from 'neverthrow';
import type { AgentBrowserError } from './types';

/**
 * agent-browserがインストールされているか確認する
 */
export const checkAgentBrowser = (): Promise<Result<string, AgentBrowserError>> => {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['agent-browser', '--help'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true, // Windows対応のため
    });

    proc.on('error', (error) => {
      // ENOENT: コマンドが見つからない
      resolve(
        err({
          type: 'not_installed',
          message: `agent-browser is not installed: ${error.message}`,
        })
      );
    });

    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(ok('agent-browser is installed'));
      } else {
        resolve(
          err({
            type: 'not_installed',
            message: `agent-browser check failed with exit code ${exitCode}`,
          })
        );
      }
    });
  });
};
```

### 注意点

- `spawn` の第一引数は `'npx'`、第二引数に `['agent-browser', '--help']`
- `shell: true` はWindows環境での互換性のため必要
- `stdio` は `['ignore', 'pipe', 'pipe']` で標準入力は不要

---

## 3. executor.ts

agent-browserコマンドの実行を実装します。

### 実装方針

1. オプションからコマンドライン引数を構築
2. spawn で実行
3. stdout/stderr を収集
4. タイムアウト処理
5. 結果をResult型で返却

### コード構造

```typescript
import { spawn, type ChildProcess } from 'node:child_process';
import { Result, ok, err } from 'neverthrow';
import type { AgentBrowserError, ExecuteOptions } from './types';

/** デフォルトタイムアウト: 30秒 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * agent-browserコマンドを実行する
 */
export const executeCommand = (
  command: string,
  args: readonly string[],
  options: ExecuteOptions = {}
): Promise<Result<string, AgentBrowserError>> => {
  const {
    sessionName,
    headed = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cwd,
  } = options;

  return new Promise((resolve) => {
    // コマンドライン引数を構築
    const fullArgs = buildArgs(command, args, sessionName, headed);

    // プロセス起動
    const proc = spawn('npx', ['agent-browser', ...fullArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      cwd,
    });

    // 出力収集
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // タイムアウト設定
    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(
        err({
          type: 'timeout',
          command,
          args,
          timeoutMs,
        })
      );
    }, timeoutMs);

    // 完了処理
    proc.on('close', (exitCode) => {
      clearTimeout(timeoutId);

      if (exitCode === 0) {
        resolve(ok(stdout));
      } else {
        // JSON出力からエラーメッセージを抽出試行
        const errorMessage = extractErrorMessage(stdout);

        resolve(
          err({
            type: 'command_failed',
            command,
            args,
            exitCode: exitCode ?? 1,
            stderr,
            errorMessage,
          })
        );
      }
    });

    // プロセス起動エラー
    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve(
        err({
          type: 'not_installed',
          message: `Failed to spawn agent-browser: ${error.message}`,
        })
      );
    });
  });
};

/**
 * コマンドライン引数を構築する
 */
const buildArgs = (
  command: string,
  args: readonly string[],
  sessionName: string | undefined,
  headed: boolean
): string[] => {
  const result: string[] = [command, ...args];

  if (sessionName !== undefined) {
    result.push('--session', sessionName);
  }

  if (headed) {
    result.push('--headed');
  }

  return result;
};

/**
 * JSON出力からエラーメッセージを抽出する
 * パースに失敗した場合はnullを返す
 */
const extractErrorMessage = (stdout: string): string | null => {
  try {
    const parsed = JSON.parse(stdout) as { error?: string | null };
    return parsed.error ?? null;
  } catch {
    return null;
  }
};
```

### 引数の順序

最終的なコマンドは以下の形式になります:

```
npx agent-browser <command> <args...> --session <sessionName> --headed
```

例:
```bash
npx agent-browser open https://example.com --json --session my-session --headed
```

### タイムアウト処理

- `setTimeout` でタイムアウトを設定
- タイムアウト時は `SIGTERM` でプロセスを終了
- `clearTimeout` で正常終了時にタイマーをクリア

---

## 4. parser.ts

JSON出力のパース処理を実装します。

### 実装方針

1. `JSON.parse` を `fromThrowable` でラップ
2. 型ガードで構造を検証
3. parseSnapshotRefs は data.refs の存在を確認

### コード構造

```typescript
import { Result, ok, err, fromThrowable } from 'neverthrow';
import type { AgentBrowserError, AgentBrowserJsonOutput, SnapshotRefs } from './types';

/**
 * JSON.parseをResult型でラップ
 */
const safeJsonParse = fromThrowable(
  (text: string) => JSON.parse(text) as unknown,
  (error): AgentBrowserError => ({
    type: 'parse_error',
    message: error instanceof Error ? error.message : 'Unknown parse error',
    rawOutput: '',
  })
);

/**
 * agent-browserの--json出力をパースする
 */
export const parseJsonOutput = <T = unknown>(
  rawOutput: string
): Result<AgentBrowserJsonOutput<T>, AgentBrowserError> => {
  return safeJsonParse(rawOutput)
    .mapErr((e) => ({
      ...e,
      rawOutput, // エラーに元の出力を含める
    }))
    .andThen((parsed) => {
      // 構造の検証
      if (!isAgentBrowserJsonOutput(parsed)) {
        return err({
          type: 'parse_error',
          message: 'Invalid JSON structure: missing success, data, or error fields',
          rawOutput,
        });
      }
      return ok(parsed as AgentBrowserJsonOutput<T>);
    });
};

/**
 * AgentBrowserJsonOutputの型ガード
 */
const isAgentBrowserJsonOutput = (value: unknown): value is AgentBrowserJsonOutput => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.success === 'boolean' &&
    'data' in obj &&
    'error' in obj
  );
};

/**
 * snapshot --json 出力から参照マップを抽出する
 */
export const parseSnapshotRefs = (
  jsonOutput: AgentBrowserJsonOutput<unknown>
): Result<SnapshotRefs, AgentBrowserError> => {
  if (!jsonOutput.success) {
    return err({
      type: 'parse_error',
      message: `Snapshot failed: ${jsonOutput.error}`,
      rawOutput: JSON.stringify(jsonOutput),
    });
  }

  const data = jsonOutput.data as Record<string, unknown> | null;

  if (data === null || typeof data.refs !== 'object' || data.refs === null) {
    return err({
      type: 'parse_error',
      message: 'Invalid snapshot output: missing refs field',
      rawOutput: JSON.stringify(jsonOutput),
    });
  }

  // refs の各エントリを検証
  const refs = data.refs as Record<string, unknown>;
  const validatedRefs: SnapshotRefs = {};

  for (const [key, value] of Object.entries(refs)) {
    if (!isSnapshotRef(value)) {
      return err({
        type: 'parse_error',
        message: `Invalid ref entry "${key}": missing name or role`,
        rawOutput: JSON.stringify(jsonOutput),
      });
    }
    validatedRefs[key] = value;
  }

  return ok(validatedRefs);
};

/**
 * SnapshotRefの型ガード
 */
const isSnapshotRef = (value: unknown): value is { name: string; role: string } => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.role === 'string';
};
```

### fromThrowable の使い方

CLAUDE.md のルールに従い:

1. `fromThrowable` のスコープは最小限（`JSON.parse` のみ）
2. 外部ライブラリ以外のコードを含まない
3. エラー変換関数で `AgentBrowserError` を返す

```typescript
// 正しい: JSON.parseのみをラップ
const safeJsonParse = fromThrowable(
  (text: string) => JSON.parse(text) as unknown,
  (error): AgentBrowserError => ({ ... })
);

// 間違い: 複数の処理をラップ
const badExample = fromThrowable(
  (text: string) => {
    const parsed = JSON.parse(text);
    // 他の処理を含めてはいけない
    return validate(parsed);
  },
  ...
);
```

---

## 5. index.ts

公開APIをre-exportします。

```typescript
/**
 * @packages/agent-browser-adapter
 *
 * agent-browser CLI との通信層を提供する。
 */

// 関数
export { checkAgentBrowser } from './check';
export { executeCommand } from './executor';
export { parseJsonOutput, parseSnapshotRefs } from './parser';

// 型
export type {
  AgentBrowserError,
  AgentBrowserJsonOutput,
  ExecuteOptions,
  SnapshotRef,
  SnapshotRefs,
} from './types';
```

---

## コーディング規約（CLAUDE.md準拠）

### neverthrow の使い方

```typescript
// 正しい: match, map, andThen でチェーン
result
  .andThen(parseJsonOutput)
  .map((output) => output.data)
  .mapErr((e) => ({ ...e, context: 'additional info' }));

// 間違い: isOk, isErr で分岐
if (result.isOk()) {
  // ...
}
```

### エラーハンドリング

```typescript
// 正しい: 早期にエラーを検出
const validateInput = (input: string): Result<string, Error> => {
  if (input.length === 0) {
    return err(new Error('Input is empty'));
  }
  return ok(input);
};

// 使用例
validateInput(input)
  .andThen(executeCommand)
  .andThen(parseJsonOutput);
```

### 純粋関数

```typescript
// 正しい: 副作用なし
const buildArgs = (command: string, args: readonly string[]): string[] => {
  return [command, ...args];
};

// 間違い: 副作用あり
const buildArgs = (command: string, args: string[]): string[] => {
  args.push(command); // 引数を変更してはいけない
  return args;
};
```
