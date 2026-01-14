# agent-browser CLI 仕様

このドキュメントは、agent-browser-adapter が依存する agent-browser CLI の仕様をまとめたものです。
**実際の動作確認に基づいて記載**しています。

---

## 基本情報

- **パッケージ**: `agent-browser`（npm）
- **実行方法**: `npx agent-browser <command> [args] [options]`
- **バージョン確認**: なし（`--version` は未対応）

---

## 共通オプション

| オプション | 説明 | 例 |
|-----------|------|-----|
| `--session <name>` | セッション名を指定。省略時は "default" | `--session my-flow` |
| `--headed` | ブラウザウィンドウを表示（デフォルトはヘッドレス） | `--headed` |
| `--json` | JSON形式で出力 | `--json` |

---

## JSON出力形式

`--json` オプション指定時の出力形式:

### 成功時

```json
{
  "success": true,
  "data": { /* コマンド固有のデータ */ },
  "error": null
}
```

### 失敗時

```json
{
  "success": false,
  "data": null,
  "error": "エラーメッセージ"
}
```

**注意**: 失敗時は exitCode が 1 になる。

---

## コマンド別仕様

### open

URLを開く。

```bash
agent-browser open <url> [--json] [--session <name>]
```

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "title": "Example Domain",
    "url": "https://example.com/"
  },
  "error": null
}
```

**exitCode**: 0

---

### click

要素をクリック。

```bash
agent-browser click <selector> [--json] [--session <name>]
```

**セレクタ形式**:
- テキスト: `"ログイン"`
- 参照ID: `"@e1"` （snapshotで取得した参照）
- CSSセレクタ: `"#submit-btn"`

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "clicked": true
  },
  "error": null
}
```

**出力例（失敗 - 要素が見つからない）**:
```json
{
  "success": false,
  "data": null,
  "error": "Element \"NotExist\" not found or not visible. Run 'snapshot' to see current page elements."
}
```

**exitCode**: 成功時 0、失敗時 1

---

### type

要素にテキストを入力（既存テキストに追加）。

```bash
agent-browser type <selector> <text> [--json] [--session <name>]
```

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "typed": true
  },
  "error": null
}
```

---

### fill

要素をクリアしてテキストを入力。

```bash
agent-browser fill <selector> <text> [--json] [--session <name>]
```

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "filled": true
  },
  "error": null
}
```

---

### press

キーを押下。

```bash
agent-browser press <key> [--json] [--session <name>]
```

**キー例**: `Enter`, `Tab`, `Escape`, `Control+a`, `Shift+Tab`

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "pressed": true
  },
  "error": null
}
```

---

### hover

要素にホバー。

```bash
agent-browser hover <selector> [--json] [--session <name>]
```

---

### select

ドロップダウンから選択。

```bash
agent-browser select <selector> <value> [--json] [--session <name>]
```

---

### scroll

スクロール。

```bash
agent-browser scroll <direction> [pixels] [--json] [--session <name>]
```

**direction**: `up`, `down`, `left`, `right`

---

### scrollintoview

要素が見えるまでスクロール。

```bash
agent-browser scrollintoview <selector> [--json] [--session <name>]
```

---

### wait

要素の出現または時間を待機。

```bash
# 要素を待機
agent-browser wait <selector> [--json] [--session <name>]

# ミリ秒待機
agent-browser wait <milliseconds> [--json] [--session <name>]
```

---

### screenshot

スクリーンショットを撮影。

```bash
agent-browser screenshot <path> [--full] [--json] [--session <name>]
```

**オプション**:
- `--full`, `-f`: フルページスクリーンショット

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "path": "/tmp/screenshot.png"
  },
  "error": null
}
```

---

### snapshot

アクセシビリティツリーを取得。

```bash
agent-browser snapshot [options] [--json] [--session <name>]
```

**オプション**:
- `-i`, `--interactive`: インタラクティブ要素のみ
- `-c`, `--compact`: 空の構造要素を除去
- `-d <n>`, `--depth <n>`: ツリーの深さ制限

**出力例（成功、--json -i）**:
```json
{
  "success": true,
  "data": {
    "refs": {
      "e1": { "name": "Example Domain", "role": "heading" },
      "e2": { "name": "Learn more", "role": "link" }
    },
    "snapshot": "- document:\n  - heading \"Example Domain\" [ref=e1] [level=1]\n  ..."
  },
  "error": null
}
```

**refs の構造**:
```typescript
{
  [refId: string]: {
    name: string;  // 要素のアクセシブル名
    role: string;  // ARIAロール (button, link, textbox, etc.)
  }
}
```

---

### eval

JavaScriptを実行。

```bash
agent-browser eval <javascript> [--json] [--session <name>]
```

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "result": "評価結果"
  },
  "error": null
}
```

---

### is visible / is enabled / is checked

要素の状態を確認。

```bash
agent-browser is visible <selector> [--json] [--session <name>]
agent-browser is enabled <selector> [--json] [--session <name>]
agent-browser is checked <selector> [--json] [--session <name>]
```

**出力例（visible）**:
```json
{
  "success": true,
  "data": {
    "visible": true
  },
  "error": null
}
```

**出力例（enabled）**:
```json
{
  "success": true,
  "data": {
    "enabled": true
  },
  "error": null
}
```

**出力例（checked）**:
```json
{
  "success": true,
  "data": {
    "checked": false
  },
  "error": null
}
```

---

### get

要素/ページの情報を取得。

```bash
agent-browser get <what> [selector] [--json] [--session <name>]
```

**what**:
- `text`: 要素のテキスト
- `html`: 要素のHTML
- `value`: input要素の値
- `attr <name>`: 属性値
- `title`: ページタイトル
- `url`: 現在のURL

**出力例（url）**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/"
  },
  "error": null
}
```

---

### close

ブラウザを閉じる。

```bash
agent-browser close [--json] [--session <name>]
```

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "closed": true
  },
  "error": null
}
```

---

### session list

アクティブなセッション一覧を取得。

```bash
agent-browser session list [--json]
```

**出力例（成功）**:
```json
{
  "success": true,
  "data": {
    "sessions": ["session-1", "session-2"]
  }
}
```

---

## エラーパターン

### 要素が見つからない

```json
{
  "success": false,
  "data": null,
  "error": "Element \"NotExist\" not found or not visible. Run 'snapshot' to see current page elements."
}
```

**exitCode**: 1

### バリデーションエラー

```json
{
  "success": false,
  "data": null,
  "error": "Validation error: path: Expected string, received null"
}
```

**exitCode**: 1

### 不明なコマンド

```
[31mUnknown command: --invalid[0m
```

**注意**: JSON形式ではなくプレーンテキストで出力される。
**exitCode**: 1

---

## セッションの挙動

1. **自動作成**: 存在しないセッション名を指定すると自動作成
2. **永続化**: ブラウザプロセスはセッション単位で維持
3. **共有**: 同じセッション名を使うと同じブラウザインスタンスを操作
4. **終了**: `close` コマンドでセッションを終了

```bash
# セッション "test" を作成してページを開く
agent-browser open https://example.com --session test

# 同じセッション "test" でクリック
agent-browser click "Learn more" --session test

# セッション "test" を終了
agent-browser close --session test
```
