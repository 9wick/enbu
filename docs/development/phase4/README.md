# Phase 4: @apps/cli

## 概要

`@apps/cli` パッケージの実装。
コマンドラインインターフェース（CLI）を提供し、ユーザーがagent-browser-flowを実行できるようにする。

## ゴール

- CLIの引数をパースして、実行モード（init / run）を判定できる
- initコマンドでプロジェクト初期化（ディレクトリ・サンプルファイル生成）ができる
- runコマンドでフロー実行（Phase 2, 3のAPIを使用）ができる
- 実行進捗・結果を人間が読みやすい形式で標準出力に表示できる
- 終了コードを適切に設定できる

## 成果物

```
apps/cli/
├── src/
│   ├── main.ts              # エントリポイント（bin）
│   ├── types.ts             # CLI固有の型定義
│   ├── args-parser.ts       # 引数パース
│   ├── commands/
│   │   ├── init.ts          # initコマンド
│   │   └── run.ts           # runコマンド（デフォルト）
│   ├── output/
│   │   ├── formatter.ts     # 進捗・結果表示
│   │   └── exit-code.ts     # 終了コード管理
│   └── utils/
│       └── fs.ts            # ファイルシステム操作ユーティリティ
└── src/__tests__/
    ├── args-parser.test.ts
    ├── init.test.ts
    ├── run.test.ts
    └── formatter.test.ts
```

## 関連ドキュメント

- [CLI仕様](./API.md) - コマンドラインインターフェース定義
- [実装ガイド](./IMPLEMENTATION.md) - 実装の詳細
- [テスト仕様](./TEST_SPEC.md) - テストケースと受け入れ基準

## 受け入れ基準

Phase 4完了の判定基準:

1. **CLI仕様**: `API.md`に定義された全コマンドが動作する
2. **初期化**: initコマンドでディレクトリ・サンプルが正しく生成される
3. **実行**: runコマンドでPhase 2, 3のAPIを使用してフローを実行できる
4. **出力**: 進捗・結果が人間が読みやすい形式で表示される
5. **終了コード**: 成功/失敗に応じた終了コードが設定される
6. **テスト**: 全テストケースがパス
7. **品質**: `pnpm run prepush` が成功

## 依存関係

### このフェーズが依存するもの
- Phase 1: `@packages/agent-browser-adapter`
  - `checkAgentBrowser`（インストール確認）
- Phase 2: `@packages/core`
  - `loadFlows`（フローファイル読み込み）
- Phase 3: `@packages/core`
  - `executeFlow`, `type FlowResult`（フロー実行）

### このフェーズに依存するもの
- なし（CLIが最終成果物）

## 実装優先順位

1. 引数パーサー（args-parser.ts）
2. 出力フォーマッター（output/formatter.ts）
3. initコマンド（commands/init.ts）
4. runコマンド（commands/run.ts）
5. mainエントリポイント（main.ts）
