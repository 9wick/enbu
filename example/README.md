# Example Projects

このディレクトリには、enbuの全18コマンドを実際に動作するサンプルとして実装したexampleプロジェクトが含まれています。

## カテゴリ構成

| カテゴリ | ディレクトリ | ポート | 対象コマンド |
|---------|-------------|--------|-------------|
| simple (既存) | example/simple/ | 3000 | open, click, assertVisible |
| navigation | example/navigation/ | 3010 | open, click, hover + assertions |
| form-input | example/form-input/ | 3020 | type, fill, press, select + assertions |
| scroll | example/scroll/ | 3030 | scroll, scrollIntoView + assertions |
| utility | example/utility/ | 3040 | wait, screenshot, snapshot, eval + assertions |
| assertions | example/assertions/ | 3050 | assertVisible, assertNotVisible, assertEnabled, assertChecked |

## テストの実行方法

各exampleプロジェクトのe2eテストは、サーバーを起動してから実行する必要があります。

### 個別カテゴリのテスト実行

```bash
# 1. サーバーを起動（バックグラウンド）
cd example/{category}
pnpm run start &

# 2. サーバー起動を待機（3秒）
sleep 3

# 3. e2eテストを実行
pnpm run test:e2e

# 4. サーバーを停止
pkill -f "tsx.*example/{category}/server.ts"
```

### 全カテゴリのテスト実行（スクリプト例）

```bash
#!/bin/bash
categories=("simple" "navigation" "form-input" "scroll" "utility" "assertions")

for category in "${categories[@]}"; do
  echo "Testing $category..."
  cd example/$category
  pnpm run start &
  server_pid=$!
  sleep 3
  pnpm run test:e2e
  test_result=$?
  kill $server_pid
  if [ $test_result -ne 0 ]; then
    echo "❌ $category failed"
    exit 1
  fi
  echo "✅ $category passed"
  cd ../..
done
```

## なぜ`test`ではなく`test:e2e`なのか？

各exampleプロジェクトでは、`test`スクリプトではなく`test:e2e`スクリプトを使用しています。

**理由:**
- exampleのe2eテストはサーバー起動が必要
- CI環境で`pnpm run test`（`nx run-many --target=test`）を実行すると、サーバーが起動していないためERR_CONNECTION_REFUSEDで失敗する
- `test:e2e`に変更することで、CI環境での自動実行から除外される
- 必要に応じて明示的に`pnpm run test:e2e`を実行する

**package.jsonの構成:**
```json
{
  "scripts": {
    "start": "tsx server.ts",
    "dev": "tsx watch server.ts",
    "test:e2e": "enbu flows/test.enbu.yaml",
    "test:headed": "enbu --headed flows/test.enbu.yaml"
  }
}
```

## ファイル構成

各カテゴリは以下の統一された構成になっています：

```
example/{category}/
├── package.json          # パッケージ定義（専用ポート設定）
├── server.ts             # Expressサーバー
├── tsconfig.json         # TypeScript設定
├── flows/
│   └── test.enbu.yaml    # e2eテストフロー
└── public/
    ├── index.html        # メインページ
    └── *.html            # 追加ページ（必要に応じて）
```

## 技術的制約

### agent-browserのセレクタ制限

- ✅ **動作する**: テキストベースのセレクタ（ボタンテキスト、リンクテキスト、フォームラベル）
- ❌ **動作しない**: CSSセレクタ（`[data-testid="..."]`など）

すべてのフローファイルでテキストベースのセレクタを使用しています。

### 実装されているコマンド一覧

#### ナビゲーション系（3コマンド）
- `open` - ページを開く
- `click` - 要素をクリック
- `hover` - 要素にホバー

#### フォーム入力系（4コマンド）
- `type` - テキスト入力・追記
- `fill` - テキスト入力・クリア後
- `press` - キーボードキー押下
- `select` - セレクトボックス選択 ⚠️ agent-browserの制限により動作に制約あり

#### スクロール系（2コマンド）
- `scroll` - 指定ピクセル分スクロール
- `scrollIntoView` - 要素までスクロール

#### ユーティリティ系（4コマンド）
- `wait` - 待機（ms指定/target指定）
- `screenshot` - スクリーンショット保存
- `snapshot` - ページ構造スナップショット
- `eval` - JavaScript実行

#### アサーション系（5コマンド）
- `assertVisible` - 表示確認
- `assertNotVisible` - 非表示確認
- `assertEnabled` - 有効化確認
- `assertChecked` - チェック状態確認

**実装済み**: 17/18コマンド（94%）

## トラブルシューティング

### サーバーが起動しない

ポートが既に使用されている可能性があります：

```bash
# 使用中のポートを確認
lsof -i :3000  # 該当ポート番号に変更

# 該当プロセスを停止
pkill -f "tsx.*example"
```

### テストがタイムアウトする

サーバーの起動に時間がかかる場合があります。`sleep 3`を`sleep 5`に変更してみてください。

### agent-browserがインストールされていない

```bash
# agent-browserのインストール確認
npx agent-browser --version

# インストールされていない場合
npx agent-browser install
```

## 参考情報

- [enbu Documentation](../../README.md)
- [Flow File Schema](../../packages/core/schemas/flow.schema.json)
- [Command Type Definitions](../../packages/core/src/types/commands.ts)
