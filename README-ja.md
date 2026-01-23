# enbu

> In martial arts, Enbu (演武) is a choreographed demonstration where practitioners perform predefined sequences of techniques. Similarly, Enbu lets you define test sequences in YAML and performs them in the browser — a rehearsal before production.

Webブラウザ向けのシンプルなE2Eテストフレームワーク。YAMLベースのフロー定義で、[agent-browser](https://github.com/vercel-labs/agent-browser)のパワフルなブラウザ自動化を活用できます。

## 特徴

- **YAMLで読みやすいステップ定義** - 人間が読みやすいシンプルな形式でテストを記述
- **セマンティックな要素指定** - テキスト、ARIAロール、ラベル等で要素を特定
- **自動待機** - 要素が現れるまで自動的に待機（明示的なsleep不要）
- **Headless/Headed両対応** - CI/CDでの自動実行も、目視でのデバッグも可能
- **失敗時のデバッグ継続** - テスト失敗時にブラウザ状態を保持したままデバッグ開始可能（AIに調査を依頼することも可能）
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

これにより `.enbuflow/` ディレクトリとサンプルフローが作成されます。

### 2. フローの作成

`.enbuflow/login.enbu.yaml`:

```yaml
# ログインフローのテスト
steps:
  - open: https://example.com/login
  - click: ログイン
  - fill:
      interactableText: メールアドレス
      value: user@example.com
  - fill:
      interactableText: パスワード
      value: password123
  - click: 送信
  - assertVisible: ダッシュボード
```

### 3. テストの実行

```bash
# 全フローを実行
npx enbu

# 特定のフローを実行
npx enbu .enbuflow/login.enbu.yaml
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
  # テキストセレクタ（テキスト、ラベル、ARIAロール等）
  - click: ログイン

  # CSSセレクタ
  - click: 
      css: "#submit-button"
```

### テキスト入力

```yaml
steps:
  # fill: 入力欄をクリアしてから入力
  - fill:
      interactableText: ユーザー名
      value: 山田太郎

  # type: 既存テキストに追記
  - type:
      interactableText: 検索欄
      value: 追加テキスト
```

### キー入力

```yaml
steps:
  # Enterキーを押す
  - press: Enter

  # Tabキーを押す
  - press: Tab
```

### アサーション

```yaml
steps:
  # 要素が表示されていることを確認
  - assertVisible: ログイン成功

  # 要素が表示されていないことを確認
  - assertNotVisible: エラー

  # 要素が有効であることを確認
  - assertEnabled: 送信ボタン

  # チェックボックスがチェックされていることを確認
  - assertChecked: 利用規約に同意

  # チェックボックスがチェックされていないことを確認
  - assertChecked:
      interactableText: オプション
      checked: false
```

### スクリーンショット

```yaml
steps:
  # 通常のスクリーンショット
  - screenshot: ./screenshots/result.png

  # フルページスクリーンショット
  - screenshot:
      path: ./screenshots/fullpage.png
      full: true
```

### スクロール

```yaml
steps:
  # 方向を指定してスクロール
  - scroll:
      direction: down
      amount: 500

  # 要素が見えるまでスクロール
  - scrollIntoView: フッター
```

### 待機

```yaml
steps:
  # ミリ秒で待機
  - wait: 2000

  # 要素が表示されるまで待機
  - wait:
      css: "#loading-complete"

  # テキストが表示されるまで待機
  - wait:
      anyText: 読み込み完了

  # URLが変わるまで待機
  - wait:
      url: /dashboard

  # ページ読み込み状態を待機
  - wait:
      load: networkidle
```

### JavaScript実行

```yaml
steps:
  - eval: document.title

  # 複数行
  - eval: |
      const element = document.querySelector('#result');
      return element.textContent;
```

## ドキュメント

### コマンドリファレンス

全コマンドの詳細なリファレンスは [docs/reference.md](./docs/REFERENCE.md) を参照してください。

この自動生成ドキュメントには、カテゴリ別に整理された17以上のコマンドの詳細な使用例が含まれています：

- **Navigation（ナビゲーション）**: `open`, `scroll`, `scrollIntoView`
- **Interaction（インタラクション）**: `click`, `hover`, `press`
- **Input（入力）**: `type`, `fill`, `select`
- **Wait（待機）**: `wait`（複数の待機戦略に対応）
- **Capture（キャプチャ）**: `screenshot`
- **Assertion（アサーション）**: `assertVisible`, `assertNotVisible`, `assertEnabled`, `assertChecked`
- **Other（その他）**: `eval`

### サンプル

[`example/`](./example/) ディレクトリには、enbuの全コマンドを実際に動作するサンプルとしてカテゴリ別に実装したプロジェクトが含まれています：

- **[simple](./example/simple/)** (ポート 3000) - 基本的なナビゲーションとアサーション
- **[navigation](./example/navigation/)** (ポート 3010) - ページ遷移、クリック、ホバー
- **[form-input](./example/form-input/)** (ポート 3020) - テキスト入力、キー入力、セレクトボックス
- **[scroll](./example/scroll/)** (ポート 3030) - スクロールと要素までのスクロール
- **[utility](./example/utility/)** (ポート 3040) - 待機、スクリーンショット、スナップショット、JavaScript実行
- **[assertions](./example/assertions/)** (ポート 3050) - 全アサーションコマンド

各サンプルには動作するExpressサーバーと `.enbuflow/` テストファイルが含まれています。実行方法は [example/README.md](./example/README.md) を参照してください。

## 環境変数

フロー内で環境変数を使用できます：

```yaml
env:
  PASSWORD: secret123
steps:
  - fill:
      interactableText: パスワード
      value: ${PASSWORD}
```

### 環境変数の指定方法

#### CLI引数で指定

```bash
npx enbu --env PASSWORD=secret123
```

#### YAML内で定義

`.enbuflow/login.enbu.yaml`:
```yaml
env:
  BASE_URL: https://staging.example.com
  PASSWORD: secret123
steps:
  - open: ${BASE_URL}/login
  - fill:
      interactableText: パスワード
      value: ${PASSWORD}
```

## CLI オプション

```bash
npx enbu [options] [flow-files...]

オプション:
  --headed          ブラウザを表示して実行（デフォルト: ヘッドレス）
  --env KEY=VALUE   環境変数を設定（複数回指定可）
  --timeout <ms>    デフォルトタイムアウト（デフォルト: 30000）
  --screenshot      失敗時にスクリーンショットを保存
  --bail            最初の失敗時にテストを停止
  --session <name>  agent-browserのセッション名を指定
  --parallel <N>    N個のフローを並列実行
  -v, --verbose     詳細なログを出力
  -h, --help        ヘルプを表示
  -V, --version     バージョンを表示
```

## ディレクトリ構成

```
your-project/
├── .enbuflow/
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

## ライセンス

MIT
