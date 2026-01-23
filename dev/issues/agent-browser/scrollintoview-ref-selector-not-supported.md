# agent-browser scrollintoview コマンドが @ref 形式のセレクタをサポートしない

## 概要

agent-browser v0.5.0 の `scrollintoview` コマンドは、ドキュメントに記載されている `@ref` 形式のセレクタ（例: `@e1`, `@e2`）をサポートしていない。他のコマンド（`click`, `fill`, `focus` など）では `@ref` 形式が使用できるが、`scrollintoview` では無効なセレクタとして扱われる。

## 再現手順

### 前提条件

- agent-browser v0.5.0
- スクロール可能なコンテンツを含むHTMLページ

### 再現コマンド

```bash
# 1. セッションを開始
npx agent-browser open http://example.com --session test-scroll

# 2. スナップショットを取得して要素のrefを確認
npx agent-browser snapshot --session test-scroll
# 出力例: @e1 - link "ホーム"
#         @e2 - button "検索"
#         @e3 - heading "お知らせ"  ← スクロール位置より下にある要素

# 3. @ref形式でscrollintoviewを実行（ここで失敗）
npx agent-browser scrollintoview @e3 --session test-scroll --json
```

## 期待される動作

`@e3` で参照される要素がビューポートに表示されるようスクロールされ、成功レスポンスが返される：
```json
{"success":true,"data":null,"error":null}
```

## 実際の動作

`@ref` 形式のセレクタが認識されず、要素が見つからないエラーが発生する。

## 原因分析

### 問題のある内部実装

agent-browser の他のコマンド（`click`, `fill`, `focus` など）では `browser.getLocator()` を使用してセレクタを解決しているが、`scrollintoview` コマンドではこのメソッドを使用せず、直接 Playwright のロケーターAPIを呼び出していると推測される。

`browser.getLocator()` は `@ref` 形式のセレクタを内部で解決する機能を持っており、これをバイパスすることで `@ref` 形式が機能しなくなっている。

### 他コマンドとの不整合

| コマンド | @ref サポート | 備考 |
|----------|---------------|------|
| click | ○ | browser.getLocator() を使用 |
| fill | ○ | browser.getLocator() を使用 |
| focus | ○ | browser.getLocator() を使用 |
| hover | ○ | browser.getLocator() を使用 |
| scrollintoview | ✗ | browser.getLocator() 未使用 |

## 影響範囲

- スナップショットから取得した `@ref` を使った要素へのスクロールができない
- E2Eテストで特定要素へのスクロールが困難
- ユーザーが一貫したセレクタ形式を使用できない

## 回避策

`focus` コマンドを代わりに使用する。Playwright の `focus()` は要素をビューポートに表示するためにスクロールする動作を持つ。

```bash
# scrollintoview の代わりに focus を使用
npx agent-browser focus @e3 --session test-scroll --json
```

### enbu での回避実装

`packages/core/src/executor/commands/scroll.ts` にて実装済み：

```typescript
/**
 * セレクタが@ref形式かどうかを判定する
 */
const isRefSelector = (selector: string): boolean => {
  return /^@e\d+$/.test(selector);
};

export const handleScrollIntoView = async (
  command: ScrollIntoViewCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const selector = context.resolvedRef ?? resolveTextSelector(command.selector);

  // agent-browser の scrollintoview は @ref 形式をサポートしないバグがあるため、
  // @ref 形式の場合は focus コマンドで代用する
  const commandName = isRefSelector(selector) ? 'focus' : 'scrollintoview';

  return (await executeCommand(commandName, [selector, '--json'], context.executeOptions))
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
```

## 提案する修正

`scrollintoview` コマンドの実装で `browser.getLocator()` を使用し、他のコマンドと同様に `@ref` 形式のセレクタを解決できるようにする。

```typescript
// 修正前（推測）
const element = await page.locator(selector);
await element.scrollIntoViewIfNeeded();

// 修正後
const locator = browser.getLocator(selector);  // @ref 形式を解決
await locator.scrollIntoViewIfNeeded();
```

## 環境情報

- **agent-browser バージョン**: 0.5.0
- **Node.js バージョン**: v20.x
- **OS**: Linux (Ubuntu)
- **発見日**: 2026-01-19

## 関連情報

- このバグは enbu の実装中に発見
- 回避策の実装箇所: `packages/core/src/executor/commands/scroll.ts:44-75`
- 関連する `@ref` セレクタ処理: `packages/core/src/executor/auto-wait.ts`
