# Phase 3: 公開API仕様

このドキュメントは `@packages/core/executor` が提供する公開APIを定義します。
**Phase 4（CLI）はこのAPIのみを使用**し、内部実装には依存しません。

---

## エクスポート一覧

```typescript
// packages/core/src/executor/index.ts

// 関数
export { executeFlow } from './flow-executor';

// 型
export type {
  FlowResult,
  StepResult,
  FlowExecutionOptions,
  ExecutionErrorType,
} from './result';
```

---

## 型定義

### FlowExecutionOptions

フロー実行時のオプション。

```typescript
/**
 * フロー実行時のオプション
 */
export type FlowExecutionOptions = {
  /** セッション名（agent-browserのセッション識別子） */
  sessionName: string;

  /** ヘッドレスモードを無効化（ブラウザウィンドウを表示） */
  headed?: boolean;

  /** 環境変数のマップ（フロー内で${VAR}形式で参照可能） */
  env?: Record<string, string>;

  /** 自動待機のデフォルトタイムアウト（ミリ秒）。デフォルト: 30000 */
  autoWaitTimeoutMs?: number;

  /** 自動待機のポーリング間隔（ミリ秒）。デフォルト: 100 */
  autoWaitIntervalMs?: number;

  /** コマンド実行のタイムアウト（ミリ秒）。デフォルト: 30000 */
  commandTimeoutMs?: number;

  /** 作業ディレクトリ（相対パス解決の基準） */
  cwd?: string;

  /** 失敗時にスクリーンショットを保存 */
  screenshot?: boolean;

  /** 最初の失敗で中断 */
  bail?: boolean;
};
```

### ExecutionErrorType

Phase 3 固有のエラータイプ定義。

```typescript
/**
 * 実行エラーの種別
 */
export type ExecutionErrorType =
  | 'not_installed'      // agent-browserがインストールされていない
  | 'command_failed'     // コマンド実行が失敗
  | 'timeout'            // タイムアウト
  | 'parse_error'        // レスポンスのパースに失敗
  | 'assertion_failed'   // アサーションが失敗
  | 'validation_error';  // バリデーションエラー
```

### StepResult

各ステップの実行結果。

```typescript
/**
 * 各ステップの実行結果
 */
export type StepResult = {
  /** ステップのインデックス（0始まり） */
  index: number;

  /** 実行されたコマンド */
  command: Command;

  /** 実行ステータス */
  status: 'passed' | 'failed';

  /** 実行時間（ミリ秒） */
  duration: number;

  /** コマンド実行の標準出力（agent-browserの生出力） */
  stdout?: string;

  /** エラー情報（失敗時のみ） */
  error?: {
    /** エラーメッセージ */
    message: string;

    /** エラー型（ExecutionErrorTypeを参照） */
    type: ExecutionErrorType;

    /** スクリーンショットパス（失敗時に自動撮影された場合） */
    screenshot?: string;
  };
};
```

### FlowResult

フロー全体の実行結果。

```typescript
/**
 * フロー全体の実行結果
 */
export type FlowResult = {
  /** 実行されたフロー */
  flow: Flow;

  /** フロー全体のステータス */
  status: 'passed' | 'failed';

  /** 全ステップの実行時間合計（ミリ秒） */
  duration: number;

  /** 各ステップの実行結果 */
  steps: StepResult[];

  /** フロー全体のエラー情報（失敗時のみ） */
  error?: {
    /** エラーメッセージ */
    message: string;

    /** 失敗したステップのインデックス */
    stepIndex: number;

    /** スクリーンショットパス（失敗時に自動撮影された場合） */
    screenshot?: string;
  };
};
```

---

## 関数仕様

### executeFlow

単一のFlowを実行します。

```typescript
import { Result } from 'neverthrow';

/**
 * フローを実行する
 *
 * フローの各ステップを順次実行し、結果を返却します。
 * いずれかのステップが失敗した場合、その時点で実行を停止します。
 *
 * @param flow - 実行するフロー（Phase 2で定義されたFlow型）
 * @param options - 実行オプション
 * @returns 成功時: FlowResult、失敗時: AgentBrowserError
 *
 * @example
 * // 基本的な使用例
 * const flow: Flow = {
 *   name: 'ログインテスト',
 *   steps: [
 *     { command: 'open', url: 'https://example.com' },
 *     { command: 'click', selector: 'ログイン' },
 *   ],
 * };
 *
 * const result = await executeFlow(flow, {
 *   sessionName: 'test-session-1',
 *   headed: false,
 *   env: { BASE_URL: 'https://example.com' },
 * });
 *
 * result.match(
 *   (flowResult) => {
 *     console.log(`Status: ${flowResult.status}`);
 *     console.log(`Duration: ${flowResult.duration}ms`);
 *     flowResult.steps.forEach((step) => {
 *       console.log(`Step ${step.index}: ${step.status}`);
 *     });
 *   },
 *   (error) => {
 *     console.error('Flow execution failed:', error);
 *   }
 * );
 *
 * @example
 * // 環境変数の使用
 * const flow: Flow = {
 *   name: 'パラメータ化されたフロー',
 *   steps: [
 *     { command: 'open', url: '${BASE_URL}/login' },
 *     { command: 'fill', selector: 'メール', value: '${USER_EMAIL}' },
 *   ],
 * };
 *
 * const result = await executeFlow(flow, {
 *   sessionName: 'test',
 *   env: {
 *     BASE_URL: 'https://staging.example.com',
 *     USER_EMAIL: 'test@example.com',
 *   },
 * });
 *
 * @example
 * // 失敗時のハンドリング（スクリーンショット有効 + 最初の失敗で中断）
 * const result = await executeFlow(flow, {
 *   sessionName: 'test',
 *   screenshot: true,  // 失敗時にスクリーンショットを保存
 *   bail: true,        // 最初の失敗で中断
 * });
 *
 * result.match(
 *   (flowResult) => {
 *     if (flowResult.status === 'failed') {
 *       console.error(`Failed at step ${flowResult.error?.stepIndex}`);
 *       console.error(`Screenshot: ${flowResult.error?.screenshot}`);
 *     }
 *   },
 *   (error) => {
 *     switch (error.type) {
 *       case 'not_installed':
 *         console.error('agent-browser is not installed');
 *         break;
 *       case 'timeout':
 *         console.error('Command timed out');
 *         break;
 *     }
 *   }
 * );
 */
export function executeFlow(
  flow: Flow,
  options: FlowExecutionOptions
): Promise<Result<FlowResult, AgentBrowserError>>;
```

**動作仕様**:

1. **環境変数の展開**:
   - 全てのコマンドのフィールドで `${VAR_NAME}` を `options.env[VAR_NAME]` に置換
   - 存在しない変数は空文字列に置換

2. **各ステップの実行**:
   - インタラクティブコマンド（click, type, fill等）の場合、自動待機を実行
   - agent-browser コマンドを実行
   - 結果を StepResult として記録

3. **自動待機**:
   - 以下のコマンドで自動的に実行:
     - `click`, `type`, `fill`, `hover`, `select`, `scrollintoview`
     - `assertVisible`, `assertEnabled`, `assertChecked`
   - `snapshot --json -i` でインタラクティブ要素を取得
   - セレクタに一致する要素が見つかるまでポーリング
   - タイムアウト: `options.autoWaitTimeoutMs`（デフォルト30秒）
   - ポーリング間隔: `options.autoWaitIntervalMs`（デフォルト100ms）

4. **失敗時の処理**:
   - `options.bail` が `true` の場合、いずれかのステップが失敗した時点で実行を停止
   - `options.bail` が `false` または未指定の場合、失敗したステップをスキップして次のステップを実行
   - `options.screenshot` が `true` の場合、失敗ステップのスクリーンショットを自動撮影（`/tmp/flow-error-{timestamp}.png`）
   - FlowResult.status を 'failed' に設定
   - FlowResult.error に失敗情報を記録

5. **戻り値の構造**:
   - 全ステップが成功: `ok(FlowResult { status: 'passed', ... })`
   - ステップ失敗: `ok(FlowResult { status: 'failed', error: { ... }, ... })`
   - システムエラー（agent-browser未インストール等）: `err(AgentBrowserError)`

---

## コマンドハンドラの共通仕様

内部実装で使用されるコマンドハンドラは以下の共通仕様に従います（公開APIではありませんが、実装の参考として記載）。

### ハンドラ関数のシグネチャ

```typescript
type CommandHandler<T extends Command> = (
  command: T,
  context: ExecutionContext
) => Promise<Result<CommandResult, AgentBrowserError>>;

type ExecutionContext = {
  /** セッション名 */
  sessionName: string;

  /** agent-browserの実行オプション */
  executeOptions: ExecuteOptions;

  /** 環境変数が展開済みかどうか */
  envExpanded: boolean;
};

type CommandResult = {
  /** コマンド実行の標準出力 */
  stdout: string;

  /** 実行時間（ミリ秒） */
  duration: number;
};
```

### 自動待機が必要なコマンド

以下のコマンドは実行前に自動待機を実行します:

- `click`
- `type`
- `fill`
- `hover`
- `select`
- `scrollintoview`
- `assertVisible`
- `assertEnabled`
- `assertChecked`

---

## 使用例（Phase 4向け）

### 基本的なフロー実行

```typescript
import { executeFlow, type FlowExecutionOptions } from '@packages/core/executor';
import type { Flow } from '@packages/core/types';

// Phase 2で定義されたFlow型を使用
const flow: Flow = {
  name: 'Example.com へのアクセス',
  steps: [
    { command: 'open', url: 'https://example.com' },
    { command: 'assertVisible', selector: 'More information' },
    { command: 'screenshot', path: './output/result.png' },
  ],
};

// フロー実行
const result = await executeFlow(flow, {
  sessionName: 'test-session-1',
  headed: false,
});

// 結果の処理
result.match(
  (flowResult) => {
    if (flowResult.status === 'passed') {
      console.log('✓ All steps passed');
    } else {
      console.error(`✗ Failed at step ${flowResult.error?.stepIndex}`);
    }
  },
  (error) => {
    console.error('Execution error:', error.message);
  }
);
```

### 環境変数を使用したフロー

```typescript
const flow: Flow = {
  name: 'ログインフロー',
  steps: [
    { command: 'open', url: '${BASE_URL}/login' },
    { command: 'fill', selector: 'email', value: '${USER_EMAIL}' },
    { command: 'fill', selector: 'password', value: '${USER_PASSWORD}' },
    { command: 'click', selector: 'ログイン' },
    { command: 'wait', target: 'ダッシュボード' },
  ],
};

const options: FlowExecutionOptions = {
  sessionName: 'login-test',
  env: {
    BASE_URL: 'https://example.com',
    USER_EMAIL: 'test@example.com',
    USER_PASSWORD: 'password123',
  },
};

const result = await executeFlow(flow, options);
```

### 複数フローの順次実行

```typescript
const flows: Flow[] = [loginFlow, dashboardFlow, logoutFlow];

for (const flow of flows) {
  const result = await executeFlow(flow, {
    sessionName: 'e2e-test',
    headed: false,
  });

  result.match(
    (flowResult) => {
      if (flowResult.status === 'failed') {
        console.error(`Flow "${flow.name}" failed`);
        // 後続のフローをスキップ
        break;
      }
    },
    (error) => {
      console.error('Execution error:', error);
      break;
    }
  );
}
```

### スクリーンショット・bail オプションの使用

```typescript
// 開発時: 全ステップを実行してデバッグ用のスクリーンショットを取得
const devResult = await executeFlow(flow, {
  sessionName: 'dev-test',
  headed: true,          // ブラウザを表示
  screenshot: true,      // 失敗時にスクリーンショット
  bail: false,           // 失敗しても続行
});

// CI環境: 最初の失敗で中断して高速フィードバック
const ciResult = await executeFlow(flow, {
  sessionName: 'ci-test',
  headed: false,         // ヘッドレス
  screenshot: true,      // 失敗時にスクリーンショット（アーティファクトとして保存）
  bail: true,            // 最初の失敗で中断
});

devResult.match(
  (flowResult) => {
    console.log(`Total steps: ${flowResult.steps.length}`);
    const failedSteps = flowResult.steps.filter(s => s.status === 'failed');
    console.log(`Failed steps: ${failedSteps.length}`);

    // 全ての失敗ステップのスクリーンショットを確認
    failedSteps.forEach((step) => {
      console.log(`Step ${step.index}: ${step.error?.screenshot}`);
    });
  },
  (error) => {
    console.error('Execution error:', error);
  }
);
```

---

## 注意事項

### 自動待機について

- `wait` コマンドは明示的な待機であり、自動待機とは異なります
- 自動待機は要素が存在するかを判定し、`wait` はタイムアウトまで待機します
- セレクタが見つからない場合、自動待機はタイムアウトエラーを返します

### セッション管理

- `sessionName` は一意である必要があります（並列実行時）
- フロー実行後、セッションは自動的にクローズされません
- 明示的に `close` コマンドをフローに含めるか、CLIレベルでクリーンアップしてください

### エラーハンドリング

```typescript
result.match(
  (flowResult) => {
    // flowResult.status が 'failed' でもこちらに来る
    // これは「フローの実行自体は成功したが、ステップが失敗した」ことを意味する
    if (flowResult.status === 'failed') {
      const failedStep = flowResult.steps[flowResult.error!.stepIndex];
      console.error(`Step failed: ${failedStep.error?.message}`);
    }
  },
  (error) => {
    // こちらは「フローの実行自体が失敗した」場合
    // 例: agent-browser未インストール、システムエラー
    console.error('System error:', error);
  }
);
```

### FlowResult.status の判定

- `flowResult.status === 'passed'`: 全ステップが成功
- `flowResult.status === 'failed'`: いずれかのステップが失敗
- `Result.isErr()`: フロー実行自体が失敗（システムエラー）

### screenshot オプション

- `screenshot: true` を指定すると、失敗したステップで自動的にスクリーンショットが撮影されます
- スクリーンショットは `/tmp/flow-error-{timestamp}.png` に保存されます
- `StepResult.error.screenshot` に保存先のパスが含まれます
- スクリーンショット撮影に失敗した場合でもステップの失敗として扱われます

### bail オプション

- `bail: true`: 最初のステップが失敗した時点でフロー全体を中断します（デフォルト動作）
  - CI環境やテストスイートで高速フィードバックが必要な場合に有効
  - 失敗したステップ以降は実行されません
- `bail: false`: 失敗したステップをスキップして、後続のステップを実行し続けます
  - 開発時やデバッグ時に、全ステップの結果を確認したい場合に有効
  - 複数のステップが失敗する可能性がある場合、全ての失敗箇所を一度に確認できます
- どちらの場合でも、`FlowResult.status` は `'failed'` となります

---

## 実装の非公開部分

以下は内部実装の詳細であり、Phase 4は依存すべきではありません:

- 個別のコマンドハンドラ関数
- 自動待機の実装詳細（`auto-wait.ts`）
- 環境変数展開の実装
- スクリーンショット撮影のタイミング

これらの詳細は `IMPLEMENTATION.md` を参照してください。
