# enbu

Webブラウザ向けのシンプルなE2Eテストフレームワーク。YAMLベースのフロー定義で、[agent-browser](https://github.com/vercel-labs/agent-browser)のパワフルなブラウザ自動化を活用できます。

## 特徴

- **YAMLベースのフロー定義** - 人間が読みやすいシンプルな形式でテストを記述
- **セマンティックな要素指定** - テキスト、ARIAロール、ラベル等で要素を特定
- **自動待機** - 要素が現れるまで自動的に待機（明示的なsleep不要）
- **agent-browser統合** - Rust製の高速ブラウザ自動化エンジンを利用
- **並列実行** - 複数のテストを同時に実行して高速化
- **豊富なロジック** - サブフロー、条件分岐、ループをサポート
- **柔軟な出力形式** - JSON、JUnit XML、TAPフォーマットに対応

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

これにより `.enbuflow/` ディレクトリ、サンプルフロー、設定ファイルが作成されます：

```
.enbuflow/
├── abflow.config.yaml      # 設定ファイル
├── example.enbu.yaml       # サンプルフロー
└── shared/
    └── login.enbu.yaml     # 共有サブフロー
```

### 2. フローの作成

`.enbuflow/checkout.enbu.yaml`:

```yaml
# ECサイトのチェックアウトフローのテスト
- open: https://shop.example.com
- click: "商品一覧"
- click: "Tシャツ"
- click: "カートに追加"
- click: "カートを見る"
- assertVisible: "Tシャツ"
- click: "購入手続きへ"

# ログインサブフローを実行
- runFlow:
    file: shared/login.enbu.yaml
    env:
      EMAIL: ${TEST_EMAIL}
      PASSWORD: ${TEST_PASSWORD}

- assertVisible: "注文確認"
- click: "注文を確定"
- assertVisible: "ご注文ありがとうございます"
```

### 3. テストの実行

```bash
# 全フローを実行
npx enbu

# 特定のフローを実行
npx enbu .enbuflow/checkout.enbu.yaml

# 並列実行
npx enbu --parallel 4

# JUnit形式でレポート出力
npx enbu --reporter junit --output results.xml
```

## コマンドリファレンス

### ナビゲーション

```yaml
- open: https://example.com
```

内部的に`agent-browser open <url>`コマンドを呼び出します。

### クリック

```yaml
# セマンティックセレクタ（テキスト、ラベル、ARIAロール等）
- click: "ログイン"

# CSSセレクタ
- click:
    selector: "#submit-button"

# インデックス指定（同名要素が複数ある場合）
- click:
    text: "詳細"
    index: 2
```

内部的に`agent-browser click <selector>`コマンドを呼び出します。セマンティックセレクタを使用する場合は、`agent-browser find text <value> click`などのfindコマンドを活用して要素を特定します。agent-browserは以下のfindオプションをサポートしています：

- `role` - ARIAロールで検索
- `text` - テキスト内容で検索
- `label` - フォームラベルで検索
- `placeholder` - プレースホルダーで検索
- `alt` - alt属性で検索
- `title` - title属性で検索
- `testid` - data-testid属性で検索
- `first`, `last`, `nth` - 複数の結果から選択

### テキスト入力

```yaml
- type:
    selector: "ユーザー名"
    text: "山田太郎"

# 入力前にクリア
- type:
    selector: "検索"
    text: "新しい検索語"
    clear: true
```

内部的に`agent-browser type <selector> <text>`コマンドを呼び出します。`clear: true`を指定した場合は`agent-browser fill <selector> <text>`を使用し、既存の入力内容をクリアしてから入力します。

### セレクトボックス

```yaml
- select:
    selector: "都道府県"
    value: "東京都"
```

内部的に`agent-browser select <selector> <value>`コマンドを呼び出します。

### スクロール

```yaml
# ページ下部へスクロール
- scroll: bottom

# 特定要素までスクロール
- scroll:
    to: "フッター"
```

内部的に以下のagent-browserコマンドを呼び出します：
- `agent-browser scroll <direction> [px]` - 指定方向にスクロール（up/down/left/right）
- `agent-browser scrollintoview <selector>` - 要素が見えるまでスクロール

### 待機

```yaml
# 要素が表示されるまで待機
- waitFor: "読み込み完了"

# カスタムタイムアウト
- waitFor:
    selector: "処理完了"
    timeout: 60000
```

内部的に`agent-browser wait <selector|ms>`コマンドを呼び出します。セレクタを指定すると要素が表示されるまで待機し、ミリ秒を指定すると固定時間待機します。

### アサーション

```yaml
# 要素が表示されていることを確認
- assertVisible: "ログイン成功"

# 要素が表示されていないことを確認
- assertNotVisible: "エラー"

# テキストの内容を確認
- assertText:
    selector: ".price"
    text: "¥1,980"

# テキストを含むことを確認
- assertContains:
    selector: ".message"
    text: "完了"

# URLを確認
- assertUrl: https://example.com/dashboard

# URLパターンを確認
- assertUrl:
    pattern: "/dashboard/*"

# ページタイトルを確認
- assertTitle: "ダッシュボード - Example"
```

内部的に`agent-browser is <what> <selector>`コマンドを使用して状態を検証します：

- `is visible <selector>` - 要素が表示されているか確認
- `is enabled <selector>` - 要素が有効か確認
- `is checked <selector>` - チェックボックスがチェックされているか確認

### スクリーンショット

```yaml
# 指定パスに保存
- screenshot: ./screenshots/result.png

# フルページスクリーンショット
- screenshot:
    path: ./screenshots/full.png
    fullPage: true
```

内部的に`agent-browser screenshot [path]`コマンドを呼び出します。フルページスクリーンショットには`--full`フラグが使用されます（`agent-browser screenshot path --full`）。

### キーボード操作

```yaml
# Enterキー
- press: Enter

# キーコンビネーション
- press: Control+a

# 複数キー
- press:
    keys:
      - Tab
      - Tab
      - Enter
```

内部的に`agent-browser press <key>`コマンドを呼び出します。Enter、Tab、Control+a などのキー入力をサポートします。

### ホバー

```yaml
- hover: "メニュー"
```

内部的に`agent-browser hover <selector>`コマンドを呼び出します。

### フォーカス

```yaml
- focus: "検索ボックス"
```

内部的に`agent-browser focus <selector>`コマンドを呼び出します。

## サブフロー（runFlow）

共通の操作をサブフローとして切り出し、再利用できます。

### サブフローの定義

`.enbuflow/shared/login.enbu.yaml`:

```yaml
# ログインサブフロー
# 環境変数 EMAIL, PASSWORD を受け取る
- click: "ログイン"
- type:
    selector: "メールアドレス"
    text: ${EMAIL}
- type:
    selector: "パスワード"
    text: ${PASSWORD}
- click: "送信"
- assertVisible: "ようこそ"
```

### サブフローの呼び出し

```yaml
- runFlow:
    file: shared/login.enbu.yaml
    env:
      EMAIL: user@example.com
      PASSWORD: ${PASSWORD}
```

## 条件分岐（when）

特定の条件下でのみ実行するフローを定義できます。

### 要素の表示による条件分岐

```yaml
# ポップアップが表示されていれば閉じる
- runFlow:
    when:
      visible: "クッキーを許可"
    commands:
      - click: "同意する"

# メインフローを続行
- click: "始める"
```

### プラットフォームによる条件分岐（将来対応予定）

```yaml
- runFlow:
    when:
      viewport: mobile
    file: mobile-navigation.enbu.yaml
```

## ループ（repeat）

### 固定回数の繰り返し

```yaml
- repeat:
    times: 3
    commands:
      - click: "次へ"
      - waitFor: "ページ読み込み完了"
```

### 条件付きループ

```yaml
- eval: "window.hasMore = true"
- repeat:
    while:
      true: ${output.hasMore}
    commands:
      - click: "もっと見る"
      - eval:
          file: check-has-more.js
```

## JavaScript実行（eval）

複雑なロジックはJavaScriptで記述できます。

### インラインスクリプト

```yaml
- eval: "document.querySelector('.timestamp').textContent = Date.now()"
```

### 外部スクリプト

```yaml
- eval:
    file: ./scripts/validate-cart.js
```

`./scripts/validate-cart.js`:

```javascript
const total = document.getElementById('cart-total').textContent;
const expected = '¥5,000';
if (total !== expected) {
  throw new Error(`期待値: ${expected}, 実際: ${total}`);
}
return true;
```

内部的に`agent-browser eval <js>`コマンドを呼び出します。JavaScriptはブラウザコンテキストで実行され、DOM操作やページ情報の取得が可能です。

## 環境変数

フロー内で環境変数を使用できます：

```yaml
- type:
    selector: "パスワード"
    text: ${PASSWORD}
```

### 環境変数の指定方法

**1. .envファイル**

```bash
# .enbuflow/.env
BASE_URL=https://staging.example.com
TEST_EMAIL=test@example.com
TEST_PASSWORD=secret123
```

**2. CLI引数**

```bash
npx enbu --env PASSWORD=secret123 --env BASE_URL=https://prod.example.com
```

**3. YAML内定義**

```yaml
env:
  BASE_URL: https://staging.example.com
---
- open: ${BASE_URL}/login
```

**4. システム環境変数**

```bash
export TEST_PASSWORD=secret123
npx enbu
```

優先順位：CLI引数 > YAML内定義 > .envファイル > システム環境変数

## 設定ファイル

`.enbuflow/abflow.config.yaml`:

```yaml
# デフォルト設定
defaults:
  timeout: 30000           # デフォルトタイムアウト（ms）
  headless: true           # ヘッドレスモード
  screenshot:
    onFailure: true        # 失敗時にスクリーンショット保存
    directory: ./screenshots

# 並列実行設定
parallel:
  workers: 4               # 並列ワーカー数

# レポート設定
reporter:
  format: json             # json | junit | tap
  output: ./reports/results.json

# デバイスプリセット
devices:
  mobile:
    width: 375
    height: 667
    deviceScaleFactor: 2
    isMobile: true
  tablet:
    width: 768
    height: 1024
    deviceScaleFactor: 2
    isMobile: true
  desktop:
    width: 1920
    height: 1080
    deviceScaleFactor: 1
    isMobile: false
```

これらの設定は、内部的に以下のagent-browserコマンドに変換されます：

- `agent-browser set viewport <width> <height>` - ビューポートサイズの設定
- `agent-browser set device <name>` - デバイスプリセットの適用

## CLI コマンド

### init

プロジェクトを初期化します。

```bash
npx enbu init [directory]

オプション:
  --force    既存のファイルを上書き
```

### run（デフォルト）

フローを実行します。

```bash
npx enbu [options] [flow-files...]

オプション:
  --headed              ブラウザを表示して実行
  --env KEY=VALUE       環境変数を設定（複数指定可）
  --timeout <ms>        デフォルトタイムアウト
  --parallel <n>        並列ワーカー数
  --device <name>       デバイスプリセット（mobile|tablet|desktop）
  --reporter <format>   レポート形式（json|junit|tap）
  --output <path>       レポート出力先
  --screenshot          失敗時にスクリーンショットを保存
  -v, --verbose         詳細なログを出力
  -h, --help            ヘルプを表示
  --version             バージョンを表示
```

### doctor（将来対応予定）

環境をチェックします。

```bash
npx enbu doctor

出力例:
✓ agent-browser v1.2.0 がインストールされています
✓ Chromium が利用可能です
✓ .enbuflow/ ディレクトリが存在します
✓ 3 個のフローファイルが見つかりました
```

### record（将来対応予定）

ブラウザ操作を記録してフローを生成します。

```bash
npx enbu record https://example.com -o login.enbu.yaml
```

## ディレクトリ構成

```
your-project/
├── .enbuflow/
│   ├── abflow.config.yaml    # 設定ファイル
│   ├── .env                  # 環境変数（.gitignoreに追加推奨）
│   ├── login.enbu.yaml       # ログインフロー
│   ├── checkout.enbu.yaml    # チェックアウトフロー
│   ├── shared/               # 共有サブフロー
│   │   └── auth.enbu.yaml
│   └── scripts/              # JavaScriptファイル
│       └── validate.js
├── screenshots/              # スクリーンショット出力先
├── reports/                  # テストレポート出力先
└── package.json
```

## レポート出力

### JSON形式

```json
{
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "duration": 45230
  },
  "flows": [
    {
      "name": "login.enbu.yaml",
      "status": "passed",
      "duration": 8500,
      "steps": [...]
    },
    {
      "name": "checkout.enbu.yaml",
      "status": "failed",
      "duration": 12300,
      "error": {
        "message": "Element 'カートに追加' not found",
        "step": 4,
        "screenshot": "./screenshots/checkout-failure.png"
      },
      "steps": [...]
    }
  ]
}
```

### JUnit XML形式

GitHub Actions等のCIツールで直接認識されます。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="enbu" tests="5" failures="1" time="45.23">
  <testsuite name="checkout.enbu.yaml" tests="1" failures="1" time="12.3">
    <testcase name="checkout.enbu.yaml" time="12.3">
      <failure message="Element 'カートに追加' not found">
        Step 4: click: "カートに追加"
        Screenshot: ./screenshots/checkout-failure.png
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### TAP形式

```
TAP version 13
1..5
ok 1 - login.enbu.yaml (8500ms)
ok 2 - signup.enbu.yaml (9200ms)
not ok 3 - checkout.enbu.yaml (12300ms)
  ---
  message: Element 'カートに追加' not found
  step: 4
  screenshot: ./screenshots/checkout-failure.png
  ...
ok 4 - profile.enbu.yaml (7800ms)
ok 5 - settings.enbu.yaml (7430ms)
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

      - name: Run E2E tests
        run: npx enbu --reporter junit --output results.xml
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            results.xml
            screenshots/

      - name: Publish test results
        if: always()
        uses: mikepenz/action-junit-report@v4
        with:
          report_paths: results.xml
```

### 並列実行（matrix戦略）

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm install
      - name: Run E2E tests (shard ${{ matrix.shard }}/4)
        run: npx enbu --shard ${{ matrix.shard }}/4
```

## ベストプラクティス

### 1. セマンティックセレクタを優先

```yaml
# 良い例 - テキストで指定
- click: "ログイン"

# 避けるべき例 - 実装詳細に依存
- click:
    selector: "button.btn-primary.login-btn"
```

### 2. フローを小さく保つ

1つのフローは1つのユーザージャーニーを表現します。

```yaml
# 良い例 - 明確な目的
# login.enbu.yaml - ログインのみ
# checkout.enbu.yaml - チェックアウトのみ（loginをrunFlowで呼ぶ）

# 避けるべき例 - 巨大なフロー
# everything.enbu.yaml - ログイン、商品選択、チェックアウト、ログアウト全部入り
```

### 3. 環境変数でシークレットを管理

```yaml
# 良い例
- type:
    selector: "パスワード"
    text: ${PASSWORD}

# 避けるべき例
- type:
    selector: "パスワード"
    text: "actualPassword123"
```

### 4. 明示的な待機より自動待機を活用

```yaml
# 良い例 - 自動待機に任せる
- click: "送信"
- assertVisible: "完了しました"

# 避けるべき例 - 固定待機時間
- click: "送信"
- sleep: 3000
- assertVisible: "完了しました"
```

## トラブルシューティング

### agent-browserが見つからない

```bash
$ npx enbu
Error: agent-browser is not installed.

Please install it first:
  npm install agent-browser

For more information: https://github.com/anthropics/agent-browser
```

**解決策**: agent-browserをインストールしてください（`npm install agent-browser`）。

### 要素が見つからない

```
Error: Element '送信ボタン' not found within 30000ms
```

**解決策**:
1. セレクタが正しいか確認
2. `--headed`オプションで実際の画面を確認
3. タイムアウトを延長: `--timeout 60000`
4. 要素が表示されるまで待機: `- waitFor: "送信ボタン"`

### テストが不安定（Flaky）

**解決策**:
1. 固定のsleepを避け、自動待機を活用
2. アニメーション完了を待つ待機を追加
3. ネットワーク状態に依存するテストを見直す

## ライセンス

MIT
