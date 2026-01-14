# Phase 1: agent-browser-adapter

## 概要

`@packages/agent-browser-adapter` パッケージの実装。
agent-browser CLIとの通信層を提供し、上位レイヤー（@packages/core）から利用される。

## ゴール

- agent-browserのインストール確認ができる
- agent-browserコマンドを実行し、結果をResult型で返却できる
- JSON出力をパースして型安全なデータ構造に変換できる

## 成果物

```
packages/agent-browser-adapter/
├── src/
│   ├── index.ts              # 公開API
│   ├── types.ts              # 型定義
│   ├── check.ts              # インストール確認
│   ├── executor.ts           # コマンド実行
│   └── parser.ts             # 出力パース
└── src/__tests__/
    ├── check.test.ts
    ├── executor.test.ts
    └── parser.test.ts
```

## 関連ドキュメント

- [公開API仕様](./API.md) - 他フェーズとのインターフェース定義
- [agent-browser CLI仕様](./AGENT_BROWSER_SPEC.md) - 外部CLI仕様
- [実装ガイド](./IMPLEMENTATION.md) - 実装の詳細
- [テスト仕様](./TEST_SPEC.md) - テストケースと受け入れ基準

## 受け入れ基準

Phase 1完了の判定基準:

1. **公開API**: `API.md`に定義された全関数がexportされている
2. **型定義**: 全ての戻り値がResult型でラップされている
3. **テスト**: 全テストケースがパス
4. **品質**: `pnpm run prepush` が成功

## 依存関係

### このフェーズが依存するもの
- `neverthrow` パッケージ（既にインストール済み）
- `agent-browser` CLI（外部、利用者がインストール）

### このフェーズに依存するもの
- Phase 2, 3: @packages/core
- Phase 4: @apps/cli（間接的に）
