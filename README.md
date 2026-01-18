# enbu

> In martial arts, Enbu (演武) is a choreographed demonstration where practitioners perform predefined sequences of techniques. Similarly, Enbu lets you define test sequences in YAML and performs them in the browser — a rehearsal before production.

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
npm install -g agent-browser
```

## インストール

```bash
npm install -g enbu
# または
npx enbu
```

## クイックスタート

### 1. プロジェクトの初期化

```bash
npx enbu init
```

これにより `.abflow/` ディレクトリとサンプルフローが作成されます。

### 2. フローの作成

`.abflow/login.enbu.yaml`:

```yaml
# ログインフローのテスト
steps:
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
npx enbu

# 特定のフローを実行
npx enbu .abflow/login.enbu.yaml
```

## コマンドリファレンス

### ページを開く

```yaml
steps:
  - open: https://example.com
```

### クリック

```yaml
steps:
  # セマンティックセレクタ（テキスト、ラベル、ARIAロール等）
  - click: "ログイン"

  # CSSセレクタ
  - click:
      selector: "#submit-button"
```

### テキスト入力

```yaml
steps:
  - type:
      selector: "ユーザー名"
      text: "山田太郎"
```

### アサーション

```yaml
steps:
  # 要素が表示されていることを確認
  - assertVisible: "ログイン成功"

  # 要素が表示されていないことを確認
  - assertNotVisible: "エラー"
```

### スクリーンショット

```yaml
steps:
  - screenshot: ./screenshots/result.png
```

### スナップショット（デバッグ用）

```yaml
steps:
  - snapshot
```

現在のページのアクセシビリティツリーを取得します。デバッグ時に要素の確認に使用します。

### JavaScript実行

```yaml
steps:
  - eval: "document.title"

  # 複数行
  - eval: |
      const element = document.querySelector('#result');
      return element.textContent;
```

## 環境変数

フロー内で環境変数を使用できます：

```yaml
steps:
  - type:
      selector: "パスワード"
      text: ${PASSWORD}
```

### 環境変数の指定方法

#### CLI引数で指定

```bash
npx enbu --env PASSWORD=secret123
```

#### YAML内で定義

`.abflow/login.enbu.yaml`:
```yaml
env:
  BASE_URL: https://staging.example.com
steps:
  - open: ${BASE_URL}/login
```

## CLI オプション

```bash
npx enbu [options] [flow-files...]

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
│   ├── login.enbu.yaml
│   ├── checkout.enbu.yaml
│   └── shared/
│       └── auth.enbu.yaml
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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install agent-browser
        run: npm install -g agent-browser

      - name: Install browsers
        run: agent-browser install --with-deps

      - name: Run E2E tests
        run: npx enbu
        env:
          PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

## agent-browser コマンド対応表

本ツールは [agent-browser](https://github.com/vercel-labs/agent-browser) のコマンドをYAMLから利用できます。以下は対応状況です。

### Core Commands

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `open <url>` | ✅ | `- open: <url>` |
| `click <selector>` | ✅ | `- click: <selector>` |
| `dblclick <selector>` | ❌ | - |
| `focus <selector>` | ❌ | - |
| `type <selector> <text>` | ✅ | `- type: { selector: <selector>, value: <text> }` |
| `fill <selector> <text>` | ✅ | `- fill: { selector: <selector>, value: <text> }` |
| `press <key>` | ✅ | `- press: <key>` |
| `keydown <key>` | ❌ | - |
| `keyup <key>` | ❌ | - |
| `hover <selector>` | ✅ | `- hover: <selector>` |
| `select <selector> <value>` | ✅ | `- select: { selector: <selector>, value: <value> }` |
| `check <selector>` | ❌ | - |
| `uncheck <selector>` | ❌ | - |
| `scroll <direction> [px]` | ✅ | `- scroll: { direction: up\|down\|left\|right, amount: <px> }` |
| `scrollintoview <selector>` | ✅ | `- scrollIntoView: <selector>` |
| `drag <source> <target>` | ❌ | - |
| `upload <selector> <files>` | ❌ | - |
| `screenshot [path]` | ✅ | `- screenshot: <path>` |
| `pdf <path>` | ❌ | - |
| `snapshot` | ✅ | `- snapshot` |
| `eval <js>` | ✅ | `- eval: <script>` |
| `close` | ❌ | - |

### Get Info

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `get text <selector>` | ❌ | - |
| `get html <selector>` | ❌ | - |
| `get value <selector>` | ❌ | - |
| `get attr <selector> <attr>` | ❌ | - |
| `get title` | ❌ | - |
| `get url` | ❌ | - |
| `get count <selector>` | ❌ | - |
| `get box <selector>` | ❌ | - |

### Check State

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `is visible <selector>` | ✅ | `- assertVisible: <selector>` |
| `is enabled <selector>` | ✅ | `- assertEnabled: <selector>` |
| `is checked <selector>` | ✅ | `- assertChecked: <selector>` |

### Find Elements

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `find role <role> <action> [value]` | ❌ | - |
| `find text <text> <action>` | ❌ | - |
| `find label <label> <action> [value]` | ❌ | - |
| `find placeholder <placeholder> <action> [value]` | ❌ | - |
| `find alt <text> <action>` | ❌ | - |
| `find title <text> <action>` | ❌ | - |
| `find testid <id> <action> [value]` | ❌ | - |
| `find first <selector> <action> [value]` | ❌ | - |
| `find last <selector> <action> [value]` | ❌ | - |
| `find nth <n> <selector> <action> [value]` | ❌ | - |

### Wait

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `wait <selector>` | ✅ | `- wait: "<selector>"` |
| `wait <ms>` | ✅ | `- wait: <ms>` |
| `wait --text <text>` | ✅ | `- wait: { text: "<text>" }` |
| `wait --url <pattern>` | ✅ | `- wait: { url: "<pattern>" }` |
| `wait --load <state>` | ✅ | `- wait: { load: "<state>" }` |
| `wait --fn <condition>` | ✅ | `- wait: { fn: "<condition>" }` |

### Mouse Control

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `mouse move <x> <y>` | ❌ | - |
| `mouse down [button]` | ❌ | - |
| `mouse up [button]` | ❌ | - |
| `mouse wheel <dy> [dx]` | ❌ | - |

### Browser Settings

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `set viewport <width> <height>` | ❌ | - |
| `set device <name>` | ❌ | - |
| `set geo <lat> <lng>` | ❌ | - |
| `set offline [on\|off]` | ❌ | - |
| `set headers <json>` | ❌ | - |
| `set credentials <user> <pass>` | ❌ | - |
| `set media [dark\|light]` | ❌ | - |

### Cookies & Storage

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `cookies` | ❌ | - |
| `cookies set <name> <value>` | ❌ | - |
| `cookies clear` | ❌ | - |
| `storage local` | ❌ | - |
| `storage local <key>` | ❌ | - |
| `storage local set <key> <value>` | ❌ | - |
| `storage local clear` | ❌ | - |
| `storage session` | ❌ | - |
| `storage session <key>` | ❌ | - |
| `storage session set <key> <value>` | ❌ | - |
| `storage session clear` | ❌ | - |

### Network

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `network route <url>` | ❌ | - |
| `network route <url> --abort` | ❌ | - |
| `network route <url> --body <json>` | ❌ | - |
| `network unroute [url]` | ❌ | - |
| `network requests` | ❌ | - |
| `network requests --filter <pattern>` | ❌ | - |

### Tabs & Windows

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `tab` | ❌ | - |
| `tab new [url]` | ❌ | - |
| `tab <n>` | ❌ | - |
| `tab close [n]` | ❌ | - |
| `window new` | ❌ | - |

### Frames

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `frame <selector>` | ❌ | - |
| `frame main` | ❌ | - |

### Dialogs

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `dialog accept [text]` | ❌ | - |
| `dialog dismiss` | ❌ | - |

### Debug

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `trace start [path]` | ❌ | - |
| `trace stop [path]` | ❌ | - |
| `console` | ❌ | - |
| `console --clear` | ❌ | - |
| `errors` | ❌ | - |
| `errors --clear` | ❌ | - |
| `highlight <selector>` | ❌ | - |
| `state save <path>` | ❌ | - |
| `state load <path>` | ❌ | - |

### Navigation

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `back` | ❌ | - |
| `forward` | ❌ | - |
| `reload` | ❌ | - |

### enbu 独自コマンド

| コマンド | YAML記法 |
|----------|----------|
| assertNotVisible | `- assertNotVisible: <selector>` |

## ライセンス

MIT
