# リファクタリング提案: TextSelector と LabelSelector の分離

## 背景

現在、YAMLで文字列ベースのセレクタを指定した場合、同じ `text` という内部型で扱われているが、
コマンドによって処理方法が異なる。

```yaml
# どちらも内部的には { text: "..." } として扱われる
- click: 送信ボタン        # snapshot経由で@refに変換が必要
- assertVisible: Welcome   # text=xxx形式で直接処理可能
```

## 現状の問題点

### 1. コマンド毎の分岐が必要

`execute-step.ts` の `shouldAllowTextDirectResolve` でコマンド毎に分岐している:

```typescript
const shouldAllowTextDirectResolve = (command: Command): boolean => {
  const textDirectCommands = ['assertVisible', 'assertNotVisible', 'scrollIntoView'];
  return textDirectCommands.includes(command.command);
};
```

これはセレクタの性質ではなく、コマンドの性質で分岐しているため、本質的ではない。

### 2. 処理方法の違い

| コマンド | 対象要素 | 処理方法 |
|---------|---------|---------|
| click, fill, type, hover, select | インタラクティブ要素（ボタン、リンク、入力欄等） | snapshot → @ref変換 |
| assertVisible, assertNotVisible | 全要素（静的テキスト含む） | `text=xxx` 形式で直接 |
| scrollIntoView | 全要素 | `text=xxx` 形式で直接 |

snapshot にはインタラクティブ要素しか含まれないため、静的テキスト（h1, p等）は
snapshot経由では見つからない。

## 提案: 内部型での明示的な分離

YAMLスキーマは変更せず、パース時にコマンドに応じて異なる内部型に振り分ける。

### 型定義

```typescript
// 新しいセレクタ型
type SelectorSpec =
  | { css: CssSelector }
  | { xpath: XpathSelector }
  | { label: LabelSelector }  // インタラクティブ要素用（snapshot経由）
  | { text: TextSelector };   // 全要素用（text=形式で直接）

// Branded types
type LabelSelector = string & Brand<'LabelSelector'>;  // 新規
type TextSelector = string & Brand<'TextSelector'>;    // 既存
```

### パース時の振り分け

```typescript
// click, fill, type, hover, select の場合
// YAML: - click: 送信ボタン
// 内部: { command: 'click', label: '送信ボタン' as LabelSelector }

// assertVisible, assertNotVisible, scrollIntoView の場合
// YAML: - assertVisible: Welcome
// 内部: { command: 'assertVisible', text: 'Welcome' as TextSelector }
```

### execute-step.ts の変更

コマンド毎の分岐が不要になる:

```typescript
// Before
if (!shouldWaitForSelector(command)) {
  const allowTextDirect = shouldAllowTextDirectResolve(command);
  const directResult = tryDirectResolve(extractResult.spec, allowTextDirect);
  // ...
}

// After
// セレクタの型だけで処理が決まる
const directResult = tryDirectResolve(extractResult.spec);
// label → snapshot経由
// text → 直接処理
```

## 影響範囲

1. **types/commands.ts**: SelectorSpec, Command型の定義変更
2. **parser/yaml-parser.ts**: パース時の振り分けロジック追加
3. **execute-step.ts**: `shouldAllowTextDirectResolve` 削除、シンプル化
4. **selector-wait.ts**: label用の待機処理追加
5. **各ハンドラ**: 既存の `isTextSelector` チェックは維持可能

## メリット

1. **明確な責務分離**: セレクタの性質がコードで明示される
2. **コマンド分岐の削除**: `shouldAllowTextDirectResolve` のような分岐が不要
3. **拡張性**: 新しいコマンド追加時に分岐リストを更新する必要がない
4. **型安全性**: コンパイル時にセレクタの種類をチェック可能

## 注意点

- YAMLスキーマは変更しない（後方互換性維持）
- 既存のテストは全て通る必要がある
- ドキュメント（REFERENCE.md）の更新は不要（ユーザー向けの変更なし）

## 関連コミット

- `3d87f70` fix(core): assertVisible/assertNotVisible/scrollIntoViewのtextセレクタを直接処理
  - 現状の問題を回避するための暫定修正
