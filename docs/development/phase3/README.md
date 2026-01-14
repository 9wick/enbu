# Phase 3: @packages/core - エグゼキュータ

## 概要

`@packages/core` パッケージのエグゼキュータ層を実装します。
Phase 2で定義された型を使用し、フロー実行エンジン、コマンドハンドラ、自動待機ロジックを提供します。

## ゴール

- 各コマンドハンドラが正しく実行できる
- 自動待機ロジックが要素の出現を検知できる
- フロー実行エンジンがステップを順次実行できる
- 実行結果を構造化されたFlowResultとして返却できる

## 成果物

```
packages/core/src/
├── executor/
│   ├── index.ts                    # 公開API
│   ├── flow-executor.ts            # FlowExecutor実装
│   ├── commands/
│   │   ├── index.ts                # コマンドハンドラのエクスポート
│   │   ├── navigation.ts           # open
│   │   ├── interaction.ts          # click, type, fill, press
│   │   ├── hover-select.ts         # hover, select
│   │   ├── scroll.ts               # scroll, scrollintoview
│   │   ├── wait.ts                 # wait
│   │   ├── capture.ts              # screenshot, snapshot
│   │   ├── eval.ts                 # eval
│   │   └── assertions.ts           # assertVisible, assertEnabled, assertChecked
│   ├── auto-wait.ts                # 自動待機ロジック
│   └── result.ts                   # FlowResult, StepResult型定義
└── executor/__tests__/
    ├── flow-executor.test.ts
    ├── commands/
    │   ├── navigation.test.ts
    │   ├── interaction.test.ts
    │   ├── hover-select.test.ts
    │   ├── scroll.test.ts
    │   ├── wait.test.ts
    │   ├── capture.test.ts
    │   ├── eval.test.ts
    │   └── assertions.test.ts
    └── auto-wait.test.ts
```

## 関連ドキュメント

- [公開API仕様](./API.md) - Phase 4が依存するインターフェース定義
- [実装ガイド](./IMPLEMENTATION.md) - 実装の詳細
- [テスト仕様](./TEST_SPEC.md) - テストケースと受け入れ基準

## 受け入れ基準

Phase 3完了の判定基準:

1. **公開API**: `API.md`に定義された全関数・型がexportされている
2. **型定義**: 全ての戻り値がResult型でラップされている
3. **テスト**: 全テストケースがパス
4. **品質**: `pnpm run prepush` が成功

## 依存関係

### このフェーズが依存するもの

- Phase 1: `@packages/agent-browser-adapter`
  ```typescript
  import {
    executeCommand,
    parseJsonOutput,
    parseSnapshotRefs,
    type ExecuteOptions,
    type AgentBrowserError,
    type SnapshotRefs,
  } from '@packages/agent-browser-adapter';
  ```

- Phase 2: `@packages/core` - 型定義
  ```typescript
  import {
    type Flow,
    type Command,
    type OpenCommand,
    type ClickCommand,
    // ... 各コマンド型
  } from '../types';
  ```

### このフェーズに依存するもの

- Phase 4: `@apps/cli` - フロー実行を呼び出す
