# Phase 1: 公開API仕様

このドキュメントは `@packages/agent-browser-adapter` が提供する公開APIを定義します。
**Phase 2以降はこのAPIのみを使用**し、内部実装には依存しません。

---

## エクスポート一覧

```typescript
// packages/agent-browser-adapter/src/index.ts

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

## 型定義

### AgentBrowserError

agent-browser実行時に発生しうるエラー型。

```typescript
/**
 * agent-browserのエラー型
 * 全てのエラーケースを網羅する判別可能なユニオン型
 */
export type AgentBrowserError =
  | {
      /** agent-browserがインストールされていない */
      type: 'not_installed';
      message: string;
    }
  | {
      /** コマンド実行が失敗（exitCode !== 0） */
      type: 'command_failed';
      command: string;
      args: readonly string[];
      exitCode: number;
      stderr: string;
      /** agent-browserが返したエラーメッセージ（JSON出力時） */
      errorMessage: string | null;
    }
  | {
      /** タイムアウト */
      type: 'timeout';
      command: string;
      args: readonly string[];
      timeoutMs: number;
    }
  | {
      /** JSON出力のパース失敗 */
      type: 'parse_error';
      message: string;
      rawOutput: string;
    };
```

### AgentBrowserJsonOutput

agent-browserの `--json` 出力の基本構造。

```typescript
/**
 * agent-browserの--json出力の共通構造
 * success: true の場合は data にコマンド固有のデータ
 * success: false の場合は error にエラーメッセージ
 */
export type AgentBrowserJsonOutput<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
```

### ExecuteOptions

コマンド実行時のオプション。

```typescript
/**
 * executeCommand のオプション
 */
export type ExecuteOptions = {
  /** セッション名（--session オプション） */
  sessionName?: string;
  /** ヘッドレスモードを無効化（--headed オプション） */
  headed?: boolean;
  /** タイムアウト（ミリ秒）。デフォルト: 30000 */
  timeoutMs?: number;
  /** 作業ディレクトリ */
  cwd?: string;
};
```

### SnapshotRef / SnapshotRefs

snapshot コマンドの参照情報。

```typescript
/**
 * snapshot出力の要素参照
 * @example { name: "ログイン", role: "button" }
 */
export type SnapshotRef = {
  name: string;
  role: string;
};

/**
 * snapshot出力の参照マップ
 * キーは "e1", "e2" などの参照ID
 * @example { "e1": { name: "ログイン", role: "button" } }
 */
export type SnapshotRefs = Record<string, SnapshotRef>;
```

---

## 関数仕様

### checkAgentBrowser

agent-browserのインストール状態を確認します。

```typescript
import { Result } from 'neverthrow';

/**
 * agent-browserがインストールされているか確認する
 *
 * @returns 成功時: 確認メッセージ、失敗時: AgentBrowserError
 *
 * @example
 * const result = await checkAgentBrowser();
 * result.match(
 *   (message) => console.log(message), // "agent-browser is installed"
 *   (error) => console.error(error)    // { type: 'not_installed', ... }
 * );
 */
export function checkAgentBrowser(): Promise<Result<string, AgentBrowserError>>;
```

**動作仕様**:
- `agent-browser --help` を実行
- exitCode 0 → `ok("agent-browser is installed")`
- exitCode !== 0 または ENOENT → `err({ type: 'not_installed', ... })`

---

### executeCommand

agent-browserコマンドを実行します。

```typescript
import { Result } from 'neverthrow';

/**
 * agent-browserコマンドを実行する
 *
 * @param command - 実行するコマンド（例: "open", "click", "snapshot"）
 * @param args - コマンド引数（例: ["https://example.com"]）
 * @param options - 実行オプション
 * @returns 成功時: stdout文字列、失敗時: AgentBrowserError
 *
 * @example
 * // 基本的な使用例
 * const result = await executeCommand('open', ['https://example.com'], {
 *   sessionName: 'my-session',
 *   headed: false,
 *   timeoutMs: 30000,
 * });
 *
 * @example
 * // --json オプションは自動付与されない（呼び出し側で指定）
 * const result = await executeCommand('snapshot', ['--json', '-i'], {
 *   sessionName: 'my-session',
 * });
 */
export function executeCommand(
  command: string,
  args: readonly string[],
  options?: ExecuteOptions
): Promise<Result<string, AgentBrowserError>>;
```

**動作仕様**:

1. 以下の形式でコマンドを構築:
   ```
   agent-browser <command> <args...> [--session <name>] [--headed]
   ```

2. `child_process.spawn` で実行

3. 結果の判定:
   - exitCode 0 → `ok(stdout)`
   - exitCode !== 0 → `err({ type: 'command_failed', ... })`
   - タイムアウト → `err({ type: 'timeout', ... })`

**オプションの適用順序**:
```
agent-browser <command> <args...> --session <sessionName> --headed
```

---

### parseJsonOutput

`--json` 出力をパースします。

```typescript
import { Result } from 'neverthrow';

/**
 * agent-browserの--json出力をパースする
 *
 * @param rawOutput - executeCommandの戻り値（stdout文字列）
 * @returns 成功時: パース済みオブジェクト、失敗時: AgentBrowserError
 *
 * @example
 * const execResult = await executeCommand('open', ['https://example.com', '--json']);
 * const parsed = execResult.andThen(parseJsonOutput);
 *
 * parsed.match(
 *   (output) => {
 *     if (output.success) {
 *       console.log(output.data); // { title: "Example", url: "..." }
 *     } else {
 *       console.error(output.error); // エラーメッセージ
 *     }
 *   },
 *   (error) => console.error(error) // パースエラー
 * );
 */
export function parseJsonOutput<T = unknown>(
  rawOutput: string
): Result<AgentBrowserJsonOutput<T>, AgentBrowserError>;
```

**動作仕様**:
- `JSON.parse` でパース
- 成功 → `ok(parsedObject)`
- 失敗 → `err({ type: 'parse_error', ... })`

---

### parseSnapshotRefs

snapshot出力から参照情報を抽出します。

```typescript
import { Result } from 'neverthrow';

/**
 * snapshot --json 出力から参照マップを抽出する
 *
 * @param jsonOutput - parseJsonOutputの戻り値
 * @returns 成功時: SnapshotRefs、失敗時: AgentBrowserError
 *
 * @example
 * const refs = await executeCommand('snapshot', ['--json', '-i'], { sessionName })
 *   .andThen(parseJsonOutput)
 *   .andThen(parseSnapshotRefs);
 *
 * refs.match(
 *   (refs) => {
 *     // { "e1": { name: "ログイン", role: "button" }, ... }
 *     console.log(refs);
 *   },
 *   (error) => console.error(error)
 * );
 */
export function parseSnapshotRefs(
  jsonOutput: AgentBrowserJsonOutput<unknown>
): Result<SnapshotRefs, AgentBrowserError>;
```

**動作仕様**:
- `jsonOutput.success === true` かつ `jsonOutput.data.refs` が存在 → `ok(refs)`
- それ以外 → `err({ type: 'parse_error', ... })`

---

## 使用例（Phase 2以降向け）

### 基本的なフロー実行

```typescript
import {
  checkAgentBrowser,
  executeCommand,
  parseJsonOutput,
  type ExecuteOptions,
} from '@packages/agent-browser-adapter';

// 1. インストール確認
const checkResult = await checkAgentBrowser();
if (checkResult.isErr()) {
  return checkResult; // early return
}

// 2. セッション設定
const options: ExecuteOptions = {
  sessionName: 'flow-123',
  headed: false,
  timeoutMs: 30000,
};

// 3. ページを開く
const openResult = await executeCommand('open', ['https://example.com', '--json'], options)
  .andThen(parseJsonOutput);

// 4. エラーハンドリング
openResult.match(
  (output) => {
    if (!output.success) {
      // agent-browserがエラーを返した
      console.error(output.error);
    }
  },
  (error) => {
    // 実行自体が失敗
    console.error(error);
  }
);
```

### snapshotで要素確認

```typescript
import {
  executeCommand,
  parseJsonOutput,
  parseSnapshotRefs,
} from '@packages/agent-browser-adapter';

const refs = await executeCommand('snapshot', ['--json', '-i'], { sessionName: 'my-session' })
  .andThen(parseJsonOutput)
  .andThen(parseSnapshotRefs);

refs.match(
  (refs) => {
    // refs["e1"] = { name: "ログイン", role: "button" }
    const loginButton = Object.entries(refs).find(
      ([_, ref]) => ref.name === 'ログイン' && ref.role === 'button'
    );
  },
  (error) => console.error(error)
);
```

---

## 注意事項

### --json オプションについて

`executeCommand` は `--json` を自動付与**しません**。
JSON出力が必要な場合は、呼び出し側で `args` に含めてください。

```typescript
// 正しい
executeCommand('open', ['https://example.com', '--json'], options);

// --jsonなし（プレーンテキスト出力）
executeCommand('open', ['https://example.com'], options);
```

### セッション管理

- `sessionName` を指定しない場合、agent-browserのデフォルトセッション（"default"）が使用されます
- 複数フローを並列実行する場合は、必ず異なる `sessionName` を指定してください
- セッションは `close` コマンドで明示的に終了できますが、プロセス終了時にも自動クリーンアップされます

### エラーの判別

```typescript
result.match(
  (stdout) => { /* 成功 */ },
  (error) => {
    switch (error.type) {
      case 'not_installed':
        // agent-browserをインストールするよう案内
        break;
      case 'command_failed':
        // error.errorMessage にagent-browserのエラー詳細
        break;
      case 'timeout':
        // タイムアウト時間を延長するか、処理を見直す
        break;
      case 'parse_error':
        // 予期しない出力形式（バグの可能性）
        break;
    }
  }
);
```
