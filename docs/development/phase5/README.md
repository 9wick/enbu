# Phase 5: 統合・E2Eテスト

## 概要

プロジェクト全体（CLI → core → adapter）の統合テストおよびE2Eテストの実装。
実際のagent-browserを使用したエンドツーエンドの検証を行い、プロダクション環境での動作を保証する。

## ゴール

- CLIから実行される完全なフローをテストできる
- 実際のagent-browserを使用したE2Eテストが実行できる
- テストフィクスチャ（HTML、YAMLフロー）が整備されている
- CI/CD環境（GitHub Actions）でテストが自動実行される

## 成果物

```
tests/
├── integration/
│   ├── cli.test.ts              # CLIの統合テスト
│   └── error-handling.test.ts   # エラーハンドリングの統合テスト
├── e2e/
│   ├── basic-flow.test.ts       # 基本フローのE2E
│   ├── assertions.test.ts       # アサーションのE2E
│   ├── interactions.test.ts     # 入力・クリック操作のE2E
│   └── error-cases.test.ts      # エラーケースのE2E
├── fixtures/
│   ├── html/
│   │   ├── login-form.html      # ログインフォーム
│   │   ├── buttons.html         # ボタン操作用
│   │   ├── form-elements.html   # フォーム要素用
│   │   └── assertions.html      # アサーション用
│   └── flows/
│       ├── simple.flow.yaml     # 基本的なフロー
│       ├── login.flow.yaml      # ログインフロー
│       ├── assertions.flow.yaml # アサーションテスト用
│       ├── interactions.flow.yaml # 操作テスト用
│       └── error-case.flow.yaml # エラーケース用
└── utils/
    ├── file-server.ts           # テスト用HTTPサーバー
    └── test-helpers.ts          # テストヘルパー関数
```

## 関連ドキュメント

- [テスト計画](./TEST_PLAN.md) - テストシナリオと戦略
- [フィクスチャ仕様](./FIXTURES.md) - HTMLファイルとYAMLフローの仕様
- [CI設定](./CI.md) - GitHub Actions設定と実行方法

## 受け入れ基準

Phase 5完了の判定基準:

1. **統合テスト**: 全ての統合テストがパス
2. **E2Eテスト**: 全てのE2Eテストがローカル環境でパス
3. **CI/CD**: GitHub Actions でテストが自動実行され成功
4. **フィクスチャ**: 全てのテストフィクスチャが動作
5. **ドキュメント**: README.md のサンプルが全て実行可能

## 依存関係

### このフェーズが依存するもの
- Phase 1: `@packages/agent-browser-adapter`（完了済み）
- Phase 2: `@packages/core`（完了済み）
- Phase 3: `@packages/flow-parser`（完了済み）
- Phase 4: `@apps/cli`（完了済み）
- `agent-browser` CLI（外部、CI環境でインストール）

### このフェーズに依存するもの
- プロダクションリリース
- ユーザー向けドキュメント

## テスト構成

### 統合テスト（tests/integration/）

Phase 1-4 で作成したモジュールの結合を検証します。

- **対象**: CLI、core、adapter の連携
- **モック**: agent-browserはモック化（高速実行）
- **目的**: モジュール間のインターフェースが正しく機能することを確認

### E2Eテスト（tests/e2e/）

実際のagent-browserを使用した完全な動作検証を行います。

- **対象**: 実際のブラウザ操作
- **モック**: なし（完全な環境）
- **目的**: プロダクション環境での動作を保証

### テストフィクスチャ（tests/fixtures/）

統合・E2Eテストで使用する静的ファイルです。

- **html/**: テスト用のHTMLページ
- **flows/**: テスト用のYAMLフローファイル

### ユーティリティ（tests/utils/）

テスト実行を支援するヘルパーモジュールです。

- **file-server.ts**: HTMLファイルを配信する軽量HTTPサーバー
- **test-helpers.ts**: テストコードの重複を削減するヘルパー関数

## テスト実行方法

### ローカルでの実行

```bash
# 全てのテストを実行
pnpm run test

# 統合テストのみ実行
pnpm run test:integration

# E2Eテストのみ実行
pnpm run test:e2e

# 特定のテストファイルを実行
pnpm run test tests/e2e/basic-flow.test.ts
```

### CI/CD環境での実行

```bash
# GitHub Actions ワークフローをローカルでテスト
act -j test

# 手動でCI環境を再現
pnpm run prepush  # 品質チェック
pnpm run test:e2e # E2Eテスト実行
```

## テストシナリオ概要

詳細は [TEST_PLAN.md](./TEST_PLAN.md) を参照。

### 統合テスト
1. CLIからのコマンド実行（ヘルプ、バージョン表示）
2. フローファイルの読み込みと実行
3. エラーハンドリング（ファイル不在、構文エラー）
4. セッション管理
5. 複数ステップの連続実行

### E2Eテスト
1. **基本フロー**: ページを開いて要素の存在を確認
2. **アサーション**: visible、enabled、checked などの検証
3. **操作**: type、fill、click、press
4. **スクリーンショット**: 画像ファイルの生成確認
5. **エラーケース**: 存在しない要素、無効な操作

## 品質基準

- **テストカバレッジ**: 統合テスト 80% 以上
- **E2Eテストの安定性**: 5回連続で全て成功
- **CI実行時間**: 10分以内
- **エラーメッセージ**: ユーザーが理解できる明確なメッセージ

## トラブルシューティング

### E2Eテストが失敗する場合

1. `agent-browser` がインストールされているか確認:
   ```bash
   npx agent-browser --help
   ```

2. テスト用HTTPサーバーが起動しているか確認:
   ```bash
   pnpm run test:server
   ```

3. ヘッドレスモードの問題:
   ```bash
   # ヘッド付きモードで実行してブラウザの動作を確認
   HEADED=true pnpm run test:e2e
   ```

### CI環境でのみ失敗する場合

1. GitHub Actions のログを確認
2. agent-browserのインストールステップを確認
3. タイムアウト設定を調整（CI環境は通常遅い）

## 次のステップ

Phase 5 完了後:

1. プロダクションリリースの準備
2. ユーザー向けドキュメントの作成
3. npm パッケージの公開
4. サンプルプロジェクトの作成
