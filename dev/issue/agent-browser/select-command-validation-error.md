# agent-browser select コマンドで "values: Invalid input" バリデーションエラーが発生する

## 概要

agent-browser v0.5.0 の `select` コマンドをCLIから実行すると、`values: Invalid input` というZodバリデーションエラーが発生し、セレクトボックスの値を変更できない。

## 再現手順

### 前提条件

- agent-browser v0.5.0
- `<select>` 要素を含むHTMLページ

### 最小再現コード

**test.html:**
```html
<!DOCTYPE html>
<html>
<body>
  <label for="payment">支払い方法</label>
  <select id="payment" aria-label="支払い方法を選択">
    <option value="">選択してください</option>
    <option value="credit">クレジットカード</option>
    <option value="bank">銀行振込</option>
  </select>
</body>
</html>
```

**再現コマンド:**
```bash
# 1. セッションを開始
npx agent-browser open http://localhost:3000/test.html --session test-select

# 2. selectコマンドを実行（ここでエラー発生）
npx agent-browser select "支払い方法を選択" credit --session test-select --json
```

## 期待される動作

セレクトボックスの値が `credit` に変更され、成功レスポンスが返される：
```json
{"success":true,"data":{"value":"credit"},"error":null}
```

## 実際の動作

バリデーションエラーが発生する：
```json
{"success":false,"data":null,"error":"Validation error: values: Invalid input"}
```

## 原因分析

### 内部スキーマ定義

`node_modules/.pnpm/agent-browser@0.5.0/node_modules/agent-browser/dist/protocol.js` を確認したところ、`selectSchema` は以下のように定義されている：

```javascript
const selectSchema = baseCommandSchema.extend({
    action: z.literal('select'),
    selector: z.string().min(1),
    values: z.union([z.string(), z.array(z.string())]),  // ← "values" (複数形) を期待
});
```

### ヘルプ出力との不整合

```
$ npx agent-browser select --help
agent-browser select - Select a dropdown option

Usage: agent-browser select <selector> <value>
                                        ^^^^^
                                        単数形 "value" と表示

Selects an option in a <select> dropdown by its value attribute.
```

### 問題の本質

CLIのコマンドライン引数パーサーが第2引数を `value`（単数形）として受け取るが、内部のZodスキーマでは `values`（複数形）フィールドを期待している。このフィールド名の不一致により、CLIから渡された値がスキーマの `values` フィールドにマッピングされず、バリデーションエラーとなる。

## 影響範囲

- CLIからの `select` コマンドが完全に機能しない
- E2Eテストでセレクトボックスの操作が不可能
- enbu（agent-browser-flow）との連携でも同様に失敗

## 回避策

現時点での回避策：

1. **HTMLでデフォルト値を事前設定する**
   ```html
   <option value="credit" selected>クレジットカード</option>
   ```

2. **JavaScript経由で値を設定する**（未検証）
   ```bash
   npx agent-browser evaluate "document.getElementById('payment').value = 'credit'" --session ...
   ```

## 提案する修正

以下のいずれかの修正が必要：

### オプション1: CLIのフィールド名を修正
CLI引数パーサーで `value` を受け取った後、内部メッセージを構築する際に `values` フィールドにマッピングする。

### オプション2: スキーマのフィールド名を修正
`selectSchema` の `values` を `value` に変更する（破壊的変更の可能性あり）。

### オプション3: 両方のフィールド名を許容
```javascript
const selectSchema = baseCommandSchema.extend({
    action: z.literal('select'),
    selector: z.string().min(1),
    value: z.union([z.string(), z.array(z.string())]).optional(),
    values: z.union([z.string(), z.array(z.string())]).optional(),
}).refine(data => data.value || data.values, {
    message: "Either 'value' or 'values' must be provided"
});
```

## 環境情報

- **agent-browser バージョン**: 0.5.0
- **Node.js バージョン**: v20.x
- **OS**: Linux (Ubuntu)
- **発見日**: 2026-01-19

## 関連情報

- このバグは [agent-browser-flow](https://github.com/anthropics/agent-browser-flow) の E2E テスト実装中に発見
- 内部呼び出し箇所: `packages/core/src/executor/commands/hover-select.ts:58`
