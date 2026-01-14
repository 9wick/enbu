# agent-browser-flow

Webブラウザ向けのシンプルなE2Eテストフレームワーク。YAMLベースのフロー定義で、[agent-browser](https://github.com/vercel-labs/agent-browser)のパワフルなブラウザ自動化を活用できます。

## 特徴

- **YAMLベースのフロー定義** - 人間が読みやすいシンプルな形式でテストを記述
- **セマンティックな要素指定** - テキスト、ARIAロール、ラベル等で要素を特定
- **自動待機** - 要素が現れるまで自動的に待機（明示的なsleep不要）
- **agent-browser統合** - Rust製の高速ブラウザ自動化エンジンを利用

## 前提条件

agent-browserがインストールされている必要があります。

```bash
# agent-browserのインストール（事前に必要）
cargo install agent-browser
```

## インストール

```bash
npm install -g agent-browser-flow
# または
npx agent-browser-flow
```

## クイックスタート

### 1. プロジェクトの初期化

```bash
npx agent-browser-flow init
```

これにより `.abflow/` ディレクトリとサンプルフローが作成されます。

### 2. フローの作成

`.abflow/login.flow.yaml`:

```yaml
# ログインフローのテスト
- open: https://example.com/login
- click: "ログイン"
- type:
    selector: "メールアドレス"
    text: "user@example.com"
- type:
    selector: "パスワード"
    text: "password123"
- click: "送信"
- assertVisible: "ダッシュボード"
```

### 3. テストの実行

```bash
# 全フローを実行
npx agent-browser-flow

# 特定のフローを実行
npx agent-browser-flow .abflow/login.flow.yaml
```

## コマンドリファレンス

### ページを開く

```yaml
- open: https://example.com
```

### クリック

```yaml
# セマンティックセレクタ（テキスト、ラベル、ARIAロール等）
- click: "ログイン"

# CSSセレクタ
- click:
    selector: "#submit-button"
```

### テキスト入力

```yaml
- type:
    selector: "ユーザー名"
    text: "山田太郎"
```

### アサーション

```yaml
# 要素が表示されていることを確認
- assertVisible: "ログイン成功"

# 要素が表示されていないことを確認
- assertNotVisible: "エラー"
```

### スクリーンショット

```yaml
- screenshot: ./screenshots/result.png
```

### スナップショット（デバッグ用）

```yaml
- snapshot
```

現在のページのアクセシビリティツリーを取得します。デバッグ時に要素の確認に使用します。

### JavaScript実行

```yaml
- eval: "document.title"

# 複数行
- eval: |
    const element = document.querySelector('#result');
    return element.textContent;
```

## 環境変数

フロー内で環境変数を使用できます：

```yaml
- type:
    selector: "パスワード"
    text: ${PASSWORD}
```

### 環境変数の指定方法

```bash
# .envファイル
echo "PASSWORD=secret123" > .env

# CLI引数
npx agent-browser-flow --env PASSWORD=secret123

# YAML内定義
```

`.abflow/login.flow.yaml`:
```yaml
env:
  BASE_URL: https://staging.example.com
---
- open: ${BASE_URL}/login
```

## CLI オプション

```bash
npx agent-browser-flow [options] [flow-files...]

オプション:
  --headed          ブラウザを表示して実行（デフォルト: ヘッドレス）
  --env KEY=VALUE   環境変数を設定
  --timeout <ms>    デフォルトタイムアウト（デフォルト: 30000）
  --screenshot      失敗時にスクリーンショットを保存
  -v, --verbose     詳細なログを出力
  -h, --help        ヘルプを表示
  --version         バージョンを表示
```

## ディレクトリ構成

```
your-project/
├── .abflow/
│   ├── login.flow.yaml
│   ├── checkout.flow.yaml
│   └── shared/
│       └── auth.flow.yaml
└── package.json
```

## CI/CD統合

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install agent-browser
        run: cargo install agent-browser

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run E2E tests
        run: npx agent-browser-flow
        env:
          PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

## ライセンス

MIT
