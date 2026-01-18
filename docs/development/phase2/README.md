# Phase 2: @packages/core

## 概要

`@packages/core` パッケージの実装。
フロー定義の型システム、YAMLパーサー、環境変数解決、フローローダーを提供し、Phase 3（フローランナー）から利用される。

## ゴール

- Flow/Command の型定義が完全に網羅されている
- *.enbu.yaml ファイルを型安全なFlowオブジェクトにパースできる
- 環境変数（${VAR}形式）を正しく解決できる
- .abflow/ ディレクトリからフローファイルを一括読み込みできる

## 成果物

```
packages/core/
├── src/
│   ├── index.ts              # 公開API
│   ├── types/
│   │   ├── index.ts          # 型定義の再エクスポート
│   │   ├── flow.ts           # Flow型定義
│   │   └── commands.ts       # Command型定義（全コマンドのユニオン型）
│   ├── parser/
│   │   ├── index.ts          # パーサーの再エクスポート
│   │   ├── yaml-parser.ts    # YAMLパース
│   │   └── env-resolver.ts   # 環境変数解決
│   └── loader/
│       ├── index.ts          # ローダーの再エクスポート
│       └── flow-loader.ts    # フローファイルのスキャンと読み込み
└── src/__tests__/
    ├── parser/
    │   ├── yaml-parser.test.ts
    │   └── env-resolver.test.ts
    └── loader/
        └── flow-loader.test.ts
```

## 関連ドキュメント

- [公開API仕様](./API.md) - 他フェーズとのインターフェース定義
- [実装ガイド](./IMPLEMENTATION.md) - 実装の詳細
- [テスト仕様](./TEST_SPEC.md) - テストケースと受け入れ基準

## 受け入れ基準

Phase 2完了の判定基準:

1. **公開API**: `API.md`に定義された全関数・型がexportされている
2. **型定義**: 全MVPコマンドの型定義が完備されている
3. **パーサー**: 正常系・異常系のYAMLを正しく処理できる
4. **環境変数**: ${VAR}形式の展開が正しく動作する
5. **ローダー**: .abflow/配下の*.enbu.yamlを全て読み込める
6. **テスト**: 全テストケースがパス
7. **品質**: `pnpm run prepush` が成功

## 依存関係

### このフェーズが依存するもの
- Phase 1: `@packages/agent-browser-adapter` の型（`AgentBrowserError`）
- `neverthrow` パッケージ
- `yaml` パッケージ（YAMLパース）
- `dotenv` パッケージ（.env読み込み）

### このフェーズに依存するもの
- Phase 3: `@packages/core` - フローランナー
- Phase 4: `@apps/cli` - CLIアプリケーション（間接的に）

## サポートするコマンド（MVP）

Phase 2で型定義を作成するコマンド一覧:

### ナビゲーション・操作系
- `open`: ページを開く
- `click`: 要素をクリック
- `type`: テキストを入力（既存のテキストをクリアしない）
- `fill`: フォームにテキストを入力（既存のテキストをクリア）
- `press`: キーボードキーを押す
- `hover`: 要素にホバー
- `select`: セレクトボックスから選択
- `scroll`: ページをスクロール
- `scrollIntoView`: 要素をビューにスクロール
- `wait`: 待機

### アサーション系
- `assertVisible`: 要素が表示されていることを確認
- `assertEnabled`: 要素が有効化されていることを確認
- `assertChecked`: チェックボックスがチェックされていることを確認

### 取得・出力系
- `screenshot`: スクリーンショットを保存
- `snapshot`: ページの構造をスナップショット
- `eval`: JavaScriptを実行

## YAML形式の仕様

### 基本構造

```yaml
# 環境変数定義（オプション）
env:
  BASE_URL: https://example.com
  TIMEOUT: 30000
---
# コマンドシーケンス
- open: https://example.com
- click: "ログインボタン"
- type:
    selector: "メールアドレス"
    text: "user@example.com"
- fill:
    selector: "パスワード"
    text: ${PASSWORD}
- press: Enter
- assertVisible: "ダッシュボード"
- screenshot: ./result.png
```

### 環境変数の参照

- `${VAR}` 形式で環境変数を参照
- フローファイル内の `env` セクションで定義された変数
- プロセス環境変数（`process.env`）
- `.env` ファイルの変数

優先順位: プロセス環境変数 > .env > フローファイルのenv

### コマンド形式

各コマンドは以下のいずれかの形式:

1. **単一文字列**: `- click: "ボタン"`
2. **オブジェクト**: `- type: { selector: "入力欄", text: "テキスト" }`
3. **配列**: `- select: ["ドロップダウン", "オプション1"]`

## 制約事項

### Phase 2の範囲外

以下はPhase 3（フローランナー）の責務:

- コマンドの実際の実行
- agent-browserとの通信
- セッション管理
- エラーハンドリング・リトライ

Phase 2は**定義と読み込みのみ**を担当します。
