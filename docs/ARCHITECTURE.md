# Architecture Document

enbuの開発者向けアーキテクチャドキュメントです。

## 概要

enbuは、YAMLベースのフロー定義をパースし、agent-browser CLIを呼び出してブラウザを自動化するNode.js製のラッパーツールです。

## Package構成

```
apps/
└── cli/                              # プレゼン層（ユーザーインターフェース）
    └── @apps/cli                     # npm公開名: enbu

packages/
├── config/                           # 共通設定（tsconfig等）
├── pnpm-sync/                        # pnpm依存同期
├── core/                             # コアロジック
│   └── @packages/core                # 型定義、パーサー、エグゼキュータ
└── agent-browser-adapter/            # agent-browser CLI呼び出し
    └── @packages/agent-browser-adapter
```

### 依存関係

```
@apps/cli
  ├── @packages/core
  └── @packages/agent-browser-adapter

@packages/core
  └── @packages/agent-browser-adapter (interface経由)

@packages/agent-browser-adapter
  └── (外部依存なし)
```

### 各Packageの責務

| Package | 責務 |
|---------|------|
| `@apps/cli` | CLI引数パース、ユーザー対話、出力フォーマット、環境チェック |
| `@packages/core` | Flow/Command型定義、YAMLパース、FlowExecutor、環境変数解決 |
| `@packages/agent-browser-adapter` | agent-browser CLI呼び出し、セッション管理、出力パース |

## レイヤー図

```
┌─────────────────────────────────────────────────────────────────┐
│                      @apps/cli (Presentation)                    │
│  - コマンドパース（init, run等）                                   │
│  - オプション処理（--headed, --env等）                             │
│  - 環境チェック（agent-browserの存在確認）                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @packages/core                              │
├─────────────────────────────────────────────────────────────────┤
│  Flow Loader                                                     │
│  - .enbuflow/ディレクトリのスキャン                                  │
│  - *.enbu.yamlファイルの検出                                      │
│  - ファイル名でソート（実行順序決定）                                │
├─────────────────────────────────────────────────────────────────┤
│  YAML Parser                                                     │
│  - YAMLパース                                                    │
│  - スキーマバリデーション                                          │
│  - 環境変数の展開（${VAR}形式）                                    │
├─────────────────────────────────────────────────────────────────┤
│  Flow Executor                                                   │
│  - フロー単位の実行管理                                            │
│  - 各フローは独立したブラウザインスタンスで実行                        │
│  - 自動待機ロジック                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               @packages/agent-browser-adapter                    │
│  - agent-browserコマンドの呼び出し                                 │
│  - 出力のパース（JSON形式）                                        │
│  - セッション管理                                                  │
│  - エラーハンドリング                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     agent-browser (外部)                         │
│  - Rust製のブラウザ自動化CLI                                       │
│  - Chromiumを制御                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
apps/cli/src/
├── main.ts                  # エントリーポイント
├── commands/
│   ├── init.ts              # initコマンド
│   └── run.ts               # runコマンド（デフォルト）
└── options.ts               # CLIオプション定義

packages/core/src/
├── index.ts                      # 公開APIのre-export
├── types/
│   ├── index.ts                  # 型定義の再エクスポート
│   ├── flow.ts                   # Flow, FlowEnv型定義
│   ├── commands.ts               # Command型定義（全コマンド）
│   └── errors.ts                 # ParseError型定義
├── parser/
│   ├── index.ts                  # パーサーの再エクスポート
│   ├── yaml-parser.ts            # parseFlowYaml実装
│   ├── env-resolver.ts           # resolveEnvVariables実装
│   └── validators/
│       ├── index.ts              # バリデーターの再エクスポート
│       ├── command-validator.ts  # コマンド検証ロジック
│       └── type-guards.ts        # 型ガード関数
└── loader/
    ├── index.ts                  # ローダーの再エクスポート
    └── flow-loader.ts            # loadFlows実装

packages/agent-browser-adapter/src/
├── index.ts                 # 公開API
├── adapter.ts               # agent-browser CLI呼び出し
├── session.ts               # セッション管理
├── parser.ts                # 出力パース
└── types/
    └── index.ts             # アダプター固有の型
```

## コア概念

### Flow（フロー）

1つのテストシナリオを表す。YAMLファイル1つが1フローに対応する。

```typescript
/**
 * フロー定義の型
 *
 * このファイルではフロー全体を表す型を定義する。
 */

/**
 * フロー内の環境変数定義
 */
export type FlowEnv = Readonly<Record<string, string>>;

/**
 * フロー定義
 */
export type Flow = {
  /** フロー名（ファイル名から取得） */
  name: string;
  /** フロー内で定義された環境変数 */
  env: FlowEnv;
  /** 実行するステップのシーケンス */
  steps: readonly Command[];
};
```

### Command（コマンド）

フロー内の1つの操作を表す。agent-browserの操作に1対1でマッピングされる。

```typescript
/**
 * コマンド型定義
 *
 * 全てのコマンドを判別可能なユニオン型として定義する。
 * 各コマンドは共通の `command` フィールドで判別され、
 * コマンド固有のプロパティがフラットな構造で定義される。
 */

/**
 * ページを開く
 */
export type OpenCommand = {
  command: 'open';
  url: string;
};

/**
 * 要素をクリック
 */
export type ClickCommand = {
  command: 'click';
  selector: string;
  /** 同名要素が複数ある場合のインデックス指定（0始まり） */
  index?: number;
};

/**
 * テキストを入力（既存のテキストをクリアしない）
 */
export type TypeCommand = {
  command: 'type';
  selector: string;
  value: string;
  /** 入力前に既存のテキストをクリアするか */
  clear?: boolean;
};

/**
 * フォームにテキストを入力（既存のテキストをクリア）
 */
export type FillCommand = {
  command: 'fill';
  selector: string;
  value: string;
};

/**
 * キーボードキーを押す
 */
export type PressCommand = {
  command: 'press';
  key: string;
};

/**
 * 要素にホバー
 */
export type HoverCommand = {
  command: 'hover';
  selector: string;
};

/**
 * セレクトボックスから選択
 */
export type SelectCommand = {
  command: 'select';
  selector: string;
  value: string;
};

/**
 * ページをスクロール
 */
export type ScrollCommand = {
  command: 'scroll';
  direction: 'up' | 'down';
  amount: number;
};

/**
 * 要素をビューにスクロール
 */
export type ScrollIntoViewCommand = {
  command: 'scrollIntoView';
  selector: string;
};

/**
 * 待機
 */
export type WaitCommand = {
  command: 'wait';
} & (
  | { ms: number }
  | { target: string }
);

/**
 * スクリーンショットを保存
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: string;
  /** フルページスクリーンショットを撮影するか */
  fullPage?: boolean;
};

/**
 * ページの構造をスナップショット
 */
export type SnapshotCommand = {
  command: 'snapshot';
};

/**
 * JavaScriptを実行
 */
export type EvalCommand = {
  command: 'eval';
  script: string;
};

/**
 * 要素が表示されていることを確認
 */
export type AssertVisibleCommand = {
  command: 'assertVisible';
  selector: string;
};

/**
 * 要素が有効化されていることを確認
 */
export type AssertEnabledCommand = {
  command: 'assertEnabled';
  selector: string;
};

/**
 * チェックボックスがチェックされていることを確認
 */
export type AssertCheckedCommand = {
  command: 'assertChecked';
  selector: string;
};

/**
 * 全てのコマンド型のユニオン
 */
export type Command =
  | OpenCommand
  | ClickCommand
  | TypeCommand
  | FillCommand
  | PressCommand
  | HoverCommand
  | SelectCommand
  | ScrollCommand
  | ScrollIntoViewCommand
  | WaitCommand
  | ScreenshotCommand
  | SnapshotCommand
  | EvalCommand
  | AssertVisibleCommand
  | AssertEnabledCommand
  | AssertCheckedCommand;
```

### Executor（エグゼキュータ）

フローを実行するエンジン。以下の責務を持つ：

1. **ブラウザライフサイクル管理**: フローごとにブラウザを起動・終了
2. **自動待機**: 各コマンド実行前に要素の出現を待機
3. **エラーハンドリング**: コマンド失敗時のスクリーンショット保存等
4. **結果収集**: 各コマンドの実行結果を収集

```typescript
/** フロー実行結果 */
interface FlowResult {
  flow: Flow;
  status: 'passed' | 'failed';
  duration: number;
  steps: StepResult[];
  error?: {
    message: string;
    step: number;
    screenshot?: string;
  };
}

/** ステップ（コマンド）実行結果 */
interface StepResult {
  command: Command;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}
```

## agent-browser連携

### コマンドマッピング

#### YAML形式からTypeScript型への変換

YAML形式:
```yaml
- open: https://example.com
- click: "ボタン"
- type:
    selector: "検索"
    text: "キーワード"
- wait: "読み込み完了"
```

TypeScript型:
```typescript
{ command: 'open', url: 'https://example.com' }
{ command: 'click', selector: 'ボタン' }
{ command: 'type', selector: '検索', value: 'キーワード' }
{ command: 'wait', target: '読み込み完了' }
```

**プロパティ名の変換規則:**
- YAMLのキー名 → `command` フィールド
- YAMLの `text` → TypeScript の `value` (TypeCommand, FillCommand)
- YAMLの `selector` (wait) → TypeScript の `target` (WaitCommand)

#### agent-browser CLIへのマッピング

| TypeScript Command | agent-browser CLI |
|-------------------|-------------------|
| `{ command: 'open', url: URL }` | `agent-browser open URL` |
| `{ command: 'click', selector: "text" }` | `agent-browser click "text"` |
| `{ command: 'type', selector, value }` | `agent-browser type "selector" "value"` |
| `{ command: 'fill', selector, value }` | `agent-browser fill "selector" "value"` |
| `{ command: 'press', key }` | `agent-browser press "key"` |
| `{ command: 'hover', selector }` | `agent-browser hover "selector"` |
| `{ command: 'select', selector, value }` | `agent-browser select "selector" "value"` |
| `{ command: 'scroll', direction, amount }` | `agent-browser scroll "direction" amount` |
| `{ command: 'scrollIntoView', selector }` | `agent-browser scrollintoview "selector"` |
| `{ command: 'wait', ms }` | `agent-browser wait ms` |
| `{ command: 'wait', target }` | `agent-browser wait "target"` |
| `{ command: 'screenshot', path, fullPage? }` | `agent-browser screenshot path [--full]` |
| `{ command: 'snapshot' }` | `agent-browser snapshot --json` |
| `{ command: 'eval', script }` | `agent-browser eval "script"` |
| `{ command: 'assertVisible', selector }` | `agent-browser is visible "selector"` |
| `{ command: 'assertEnabled', selector }` | `agent-browser is enabled "selector"` |
| `{ command: 'assertChecked', selector }` | `agent-browser is checked "selector"` |

### セッション管理

agent-browserは`--session <name>`オプションで複数のブラウザインスタンスを独立して管理する。
enbuは各フローに一意のセッション名を割り当て、フロー間の独立性を保証する。

### ヘッドレス/有頭モード

- **デフォルト**: ヘッドレスモード（ブラウザウィンドウは表示されない）
- **`--headed`オプション**: 有頭モード（ブラウザウィンドウを表示）
  - enbuの`--headed`オプションは、agent-browserに`--headed`として渡される

```typescript
/** agent-browser呼び出しの抽象化 */
interface AgentBrowserAdapter {
  /** 新しいセッションを開始 */
  startSession(options: SessionOptions): Promise<Result<string, AgentBrowserError>>;

  /** コマンドを実行 */
  execute(sessionId: string, command: string, args: string[]): Promise<Result<string, AgentBrowserError>>;

  /** セッションを終了 */
  endSession(sessionId: string): Promise<Result<void, AgentBrowserError>>;
}

/** セッションオプション */
interface SessionOptions {
  /** セッション名（--sessionオプション） */
  sessionName: string;
  /** 有頭モード（--headedオプション） */
  headed: boolean;
  /** JSONフォーマット出力（--jsonオプション） */
  json: boolean;
  /** ビューポートサイズ（将来的に実装） */
  viewport?: { width: number; height: number };
  /** タイムアウト時間（ミリ秒） */
  timeout: number;
}
```

### エラーハンドリング

agent-browserからのエラーは`neverthrow`のResult型で扱う。

```typescript
import { Result, err, ok } from 'neverthrow';

type AgentBrowserError =
  | { type: 'not_installed'; message: string }
  | { type: 'element_not_found'; selector: string; timeout: number }
  | { type: 'navigation_failed'; url: string; reason: string }
  | { type: 'timeout'; command: string; timeout: number }
  | { type: 'unknown'; message: string; stderr: string };

/** agent-browserの呼び出し結果 */
const executeCommand = (
  sessionId: string,
  command: string
): Promise<Result<string, AgentBrowserError>> => {
  // 実装
};
```

## 自動待機ロジック

Yamlを自然とかけるように、「自動待機」を実装する。

### 待機戦略

1. **ナビゲーション後**: ページのloadイベントまで待機
2. **クリック前**: 対象要素が表示され、クリック可能になるまで待機
3. **入力前**: 対象要素が表示され、フォーカス可能になるまで待機
4. **アサーション**: 対象要素が条件を満たすまで待機（タイムアウト付き）

### 実装方針

agent-browserの`snapshot`コマンドで現在のページ状態（Accessibility Tree）を取得し、
対象要素の存在とインタラクション可能性を確認する。

- `snapshot`: 全要素のアクセシビリティツリーを取得（参照番号付き）
- `snapshot -i`: インタラクティブ要素のみを取得
- `snapshot --json`: JSON形式で出力（パース可能）

```typescript
/** 要素の待機 */
const waitForElement = async (
  adapter: AgentBrowserAdapter,
  sessionId: string,
  selector: string,
  options: WaitOptions
): Promise<Result<ElementInfo, WaitError>> => {
  const startTime = Date.now();

  while (Date.now() - startTime < options.timeout) {
    // --jsonオプションでJSON形式の出力を取得
    // -iオプションでインタラクティブ要素のみを対象にすることも可能
    const snapshot = await adapter.execute(sessionId, 'snapshot', ['--json', '-i']);

    return snapshot.andThen((json) => {
      const tree = JSON.parse(json);
      const element = findElement(tree, selector);

      if (element && isInteractable(element)) {
        return ok(element);
      }

      // 短いスリープ後にリトライ
      return err({ type: 'not_ready' as const });
    });
  }

  return err({
    type: 'timeout',
    selector,
    timeout: options.timeout,
  });
};
```

## 環境変数解決

### 優先順位（高い順）

1. CLI引数 (`--env KEY=VALUE`)
2. YAML内定義 (`env:` セクション)
3. `.env`ファイル（`.enbuflow/.env`）
4. システム環境変数

### 展開ロジック

```typescript
/** 環境変数の展開 */
const resolveEnv = (
  template: string,
  env: Record<string, string>
): Result<string, EnvError> => {
  const pattern = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

  let result = template;
  let match;

  while ((match = pattern.exec(template)) !== null) {
    const [placeholder, varName] = match;
    const value = env[varName];

    if (value === undefined) {
      return err({
        type: 'undefined_variable',
        variable: varName,
      });
    }

    result = result.replace(placeholder, value);
  }

  return ok(result);
};
```

## 拡張ポイント

### 新しいコマンドの追加

Phase 2（パーサー）での追加手順:

1. `packages/core/src/types/commands.ts`にコマンド型を追加
2. `packages/core/src/types/commands.ts`のCommand unionに追加
3. `packages/core/src/parser/validators/type-guards.ts`に型ガード関数を追加
4. `packages/core/src/parser/validators/command-validator.ts`に検証ロジックを追加

```typescript
// 1. types/commands.tsに型を追加
export type CustomCommand = {
  command: 'custom';
  param1: string;
  param2?: number;
};

// Command unionに追加
export type Command =
  | OpenCommand
  | ClickCommand
  // ... 他のコマンド
  | CustomCommand;

// 2. validators/type-guards.tsに型ガードを追加
export const isCustomCommand = (value: unknown): value is CustomCommand => {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.command !== 'custom') return false;
  if (typeof obj.param1 !== 'string') return false;
  if (obj.param2 !== undefined && typeof obj.param2 !== 'number') return false;
  return true;
};

// 3. validators/command-validator.tsに検証を追加
export const validateCommand = (
  command: unknown,
  commandIndex: number
): Result<Command, ParseError> => {
  // ...
  if (isCustomCommand(command)) return ok(command);
  // ...
};
```

### 新しいレポーターの追加（将来）

1. `src/reporters/`にレポーター実装を追加
2. `src/cli/options.ts`に`--reporter`オプションの選択肢を追加

```typescript
// src/reporters/custom.ts
import { FlowResult } from '../types';

export interface Reporter {
  onFlowStart(flow: Flow): void;
  onFlowEnd(result: FlowResult): void;
  onRunEnd(results: FlowResult[]): string;
}

export const createCustomReporter = (): Reporter => ({
  onFlowStart: (flow) => { /* ... */ },
  onFlowEnd: (result) => { /* ... */ },
  onRunEnd: (results) => {
    // カスタム形式の文字列を返す
    return JSON.stringify(results, null, 2);
  },
});
```

## MVP vs Full実装

### MVP（初期リリース）

- [ ] CLI基本構造（init, run）
- [ ] YAMLパース（シンプルなシーケンスのみ）
- [ ] 基本コマンド（open, click, type, fill, screenshot）
- [ ] 追加の基本コマンド（press, hover, select, scroll, scrollintoview, wait）
- [ ] 基本アサーション（assertVisible, assertEnabled, assertChecked）
- [ ] snapshotとevalコマンド
- [ ] 環境変数サポート
- [ ] 自動待機
- [ ] 失敗時のトレースログ
- [ ] --headedオプション（有頭モード）
- [ ] --sessionオプション（セッション管理）
- [ ] agent-browserインストールチェック

### Future（将来実装）

- [ ] runFlow（サブフロー）
- [ ] when（条件分岐）
- [ ] repeat（ループ）
- [ ] runScript（JavaScript実行）
- [ ] 並列実行
- [ ] 複数レポート形式（JUnit XML, TAP）
- [ ] コンフィグファイル
- [ ] デバイスプリセット
- [ ] recordコマンド（ブラウザ操作記録）
- [ ] doctorコマンド（環境チェック）
- [ ] ファイルアップロード
- [ ] ダイアログハンドリング

## テスト戦略

### ユニットテスト

- YAMLパーサー
- 環境変数解決
- コマンドバリデーション

### 統合テスト

- agent-browserアダプター（モック使用）
- フロー実行エンジン

### E2Eテスト

- 実際のagent-browserを使用したテスト
- サンプルWebサイトに対するフロー実行

```typescript
// tests/e2e/basic-flow.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Basic Flow Execution', () => {
  it('should execute a simple navigation flow', () => {
    const result = execSync(
      'npx enbu tests/fixtures/simple.enbu.yaml',
      { encoding: 'utf-8' }
    );

    expect(result).toContain('passed');
  });
});
```

## 設計原則

1. **agent-browserへの薄いラッパー**: 独自の複雑なロジックは最小限に
2. **Fail Fast**: エラーは早期に検出し、明確なメッセージを出力
3. **neverthrowによる型安全なエラーハンドリング**: 例外ではなくResult型
4. **純粋関数優先**: 副作用はアダプター層に集約
5. **YAGNI**: 現時点で必要ない機能は実装しない
