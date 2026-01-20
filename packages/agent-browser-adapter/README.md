# @packages/agent-browser-adapter

agent-browser CLI との型安全な通信層を提供するパッケージ。

## 概要

このパッケージは [agent-browser](https://github.com/anthropics/agent-browser) CLI をラップし、TypeScript から型安全にブラウザ操作を行うためのアダプター層を提供する。

### 主な特徴

- **型安全な API**: Brand 型と valibot スキーマによる厳密な型検証
- **Result 型によるエラーハンドリング**: neverthrow を使用した安全なエラー処理
- **コマンド別の専用関数**: 各ブラウザ操作に対応した関数を提供
- **出力の自動検証**: CLI 出力を valibot スキーマで検証

## インストール

```bash
pnpm add @packages/agent-browser-adapter
```

## 使用方法

### 基本的な使い方

```typescript
import {
  browserOpen,
  browserClick,
  browserFill,
  asUrl,
  asSelector,
} from '@packages/agent-browser-adapter';

// URLを開く
// asUrl, asSelectorなどのas*関数はResult型を返すため、
// asyncAndThenでチェーンして処理する
const openResult = await asUrl('https://example.com')
  .asyncAndThen((url) => browserOpen(url, {
    sessionName: 'my-session',
    headed: true,
  }));

openResult.match(
  (data) => console.log('Opened:', data.url),
  (error) => console.error('Failed:', error.message),
);

// 要素をクリック
const clickResult = await asSelector('#login-button')
  .asyncAndThen((selector) => browserClick(selector));

// フォームに入力
const fillResult = await asSelector('#email')
  .asyncAndThen((selector) => browserFill(selector, 'user@example.com'));
```

### セッション管理

```typescript
import { browserOpen, browserClose, asUrl } from '@packages/agent-browser-adapter';

// セッションを指定してブラウザを開く
await asUrl('https://example.com')
  .asyncAndThen((url) => browserOpen(url, {
    sessionName: 'test-session',
    headed: true, // ヘッドレスモードを無効化
    timeoutMs: 30000, // タイムアウト設定
  }));

// セッションを閉じる
await browserClose({ sessionName: 'test-session' });
```

## API リファレンス

### ナビゲーション

| 関数 | 説明 |
|------|------|
| `browserOpen(url, options)` | 指定した URL をブラウザで開く |

### インタラクション

| 関数 | 説明 |
|------|------|
| `browserClick(selector, options)` | 要素をクリック |
| `browserType(selector, value, options)` | テキストを入力（既存テキストを保持） |
| `browserFill(selector, value, options)` | テキストを入力（既存テキストをクリア） |
| `browserPress(key, options)` | キーボードキーを押す |
| `browserHover(selector, options)` | 要素にマウスホバー |
| `browserSelect(selector, value, options)` | セレクトボックスから値を選択 |
| `browserFocus(selector, options)` | 要素にフォーカス |

### スクロール

| 関数 | 説明 |
|------|------|
| `browserScroll(direction, amount, options)` | ページをスクロール |
| `browserScrollIntoView(selector, options)` | 要素が表示されるまでスクロール |

### 待機

| 関数 | 説明 |
|------|------|
| `browserWaitForMs(ms, options)` | 指定ミリ秒待機 |
| `browserWaitForSelector(selector, options)` | セレクタの要素が出現するまで待機 |
| `browserWaitForText(text, options)` | テキストが出現するまで待機 |
| `browserWaitForLoad(state, options)` | ページのロード状態を待機 |
| `browserWaitForNetworkIdle(options)` | ネットワークがアイドル状態になるまで待機 |
| `browserWaitForUrl(pattern, options)` | URL が変化するまで待機 |
| `browserWaitForFunction(fn, options)` | JavaScript 式が truthy になるまで待機 |

### キャプチャ

| 関数 | 説明 |
|------|------|
| `browserScreenshot(path, options)` | スクリーンショットを撮影 |
| `browserSnapshot(options)` | ページのアクセシビリティツリーを取得 |

### JavaScript 実行

| 関数 | 説明 |
|------|------|
| `browserEval(expression, options)` | JavaScript 式を実行 |

### 状態チェック

| 関数 | 説明 |
|------|------|
| `browserIsVisible(selector, options)` | 要素が表示されているか確認 |
| `browserIsEnabled(selector, options)` | 要素が有効化されているか確認 |
| `browserIsChecked(selector, options)` | チェックボックスがチェックされているか確認 |

### セッション管理

| 関数 | 説明 |
|------|------|
| `browserClose(options)` | ブラウザセッションを閉じる |

### ユーティリティ

| 関数 | 説明 |
|------|------|
| `checkAgentBrowser()` | agent-browser CLI がインストールされているか確認 |

## 型システム

### Brand 型

引数の誤りを防ぐため、Brand 型を使用している。生の文字列を渡すことはできず、専用のファクトリ関数を使用する必要がある。

**重要**: 各as*関数は `Result<Brand型, BrandValidationError>` を返すため、成功時の値を取り出すには `.asyncAndThen()` や `.match()` などのメソッドを使用する必要がある。

```typescript
import {
  asSelector,
  asUrl,
  asFilePath,
  asKeyboardKey,
  asJsExpression,
  browserOpen,
} from '@packages/agent-browser-adapter';

// セレクタ（Result<Selector, BrandValidationError>を返す）
const selectorResult = asSelector('#my-button');
const refSelectorResult = asSelector('@e1');
const textSelectorResult = asSelector('text="ログイン"');

// URL（Result<Url, BrandValidationError>を返す）
const urlResult = asUrl('https://example.com');

// ファイルパス（Result<FilePath, BrandValidationError>を返す）
const pathResult = asFilePath('./screenshots/result.png');

// キーボードキー（Result<KeyboardKey, BrandValidationError>を返す）
const keyResult = asKeyboardKey('Enter');

// JavaScript式（Result<JsExpression, BrandValidationError>を返す）
const exprResult = asJsExpression('document.title');

// Result型の値をasynAndThenでチェーンして使用
await asUrl('https://example.com')
  .asyncAndThen((url) => browserOpen(url, { sessionName: 'test' }));

// またはmatchでエラーハンドリング
const result = asSelector('#my-button').match(
  (selector) => {
    // 成功時の処理
    return selector;
  },
  (error) => {
    // エラー時の処理
    console.error('検証失敗:', error.message);
    return null;
  },
);
```

### エラー型

全ての関数は `ResultAsync<T, AgentBrowserError>` を返す（以前の `Promise<Result<T, E>>` から変更）。エラー型は以下の種類がある：

| type | 説明 |
|------|------|
| `not_installed` | agent-browser CLI が見つからない、または起動できない |
| `command_failed` | プロセスが非0終了コードで終了した（exitCode !== 0） |
| `command_execution_failed` | agent-browserがsuccess:falseを返した（exitCode === 0だが操作失敗） |
| `timeout` | コマンドがタイムアウトした |
| `parse_error` | JSON出力のパースに失敗した |
| `agent_browser_output_parse_error` | CLI出力がスキーマに合わない（valibot検証失敗） |
| `brand_validation_error` | Brand型の検証に失敗した（as*関数で空文字列など） |

### 出力型

各関数は `ResultAsync<Data型, AgentBrowserError>` を返す。agent-browser CLIの生出力（`{success, data, error}` 構造）は内部で処理され、外部APIとしては `data` の型のみがエクスポートされる。

主な出力型：

| 型 | コマンド | 内容 |
|----|----------|------|
| `OpenData` | browserOpen | `{ url: string }` |
| `EmptyData` | browserClick, browserType, browserFill など | `{}` |
| `ScreenshotData` | browserScreenshot | `{ path: string }` |
| `SnapshotData` | browserSnapshot | `{ snapshot: string, refs: Record<string, SnapshotRef> }` |
| `EvalData` | browserEval | `{ result: unknown }` |
| `IsVisibleData` | browserIsVisible | `{ visible: boolean }` |
| `IsEnabledData` | browserIsEnabled | `{ enabled: boolean }` |
| `IsCheckedData` | browserIsChecked | `{ checked: boolean }` |

使用例：

```typescript
// openの戻り値はResultAsync<OpenData, AgentBrowserError>
const result = await asUrl('https://example.com')
  .asyncAndThen((url) => browserOpen(url));

result.match(
  (data) => {
    // dataはOpenData型 = { url: string }
    console.log('Opened:', data.url);
  },
  (error) => {
    // errorはAgentBrowserError型
    console.error('Failed:', error.message);
  },
);
```

## 実行オプション

```typescript
type ExecuteOptions = {
  sessionName?: string;  // セッション名（同一セッションでブラウザを共有）
  headed?: boolean;      // ヘッドレスモードを無効化（デフォルト: false）
  timeoutMs?: number;    // タイムアウト（ミリ秒）
  cwd?: string;          // 作業ディレクトリ
};

// screenshot のみ追加オプション
type ScreenshotOptions = ExecuteOptions & {
  fullPage?: boolean;    // ページ全体のスクリーンショット
};
```

## 依存関係

- [neverthrow](https://github.com/supermacro/neverthrow): Result 型によるエラーハンドリング
- [valibot](https://valibot.dev/): スキーマ検証と Brand 型

## ディレクトリ構成

```
src/
├── commands/           # コマンド別の関数
│   ├── navigation.ts   # browserOpen
│   ├── interaction.ts  # browserClick, browserType, browserFill...
│   ├── scroll.ts       # browserScroll, browserScrollIntoView
│   ├── wait.ts         # browserWaitFor*
│   ├── capture.ts      # browserScreenshot, browserSnapshot
│   ├── eval.ts         # browserEval
│   ├── is.ts           # browserIsVisible, browserIsEnabled, browserIsChecked
│   └── session.ts      # browserClose
├── executor.ts         # CLI 実行のコア処理
├── validator.ts        # valibot による出力検証
├── schemas.ts          # 出力スキーマ定義
├── types.ts            # 型定義
├── check.ts            # インストール確認
└── index.ts            # エクスポート
```

## 開発

```bash
# ビルド
pnpm run build

# 型チェック
pnpm run typecheck

# リント
pnpm run lint

# テスト
pnpm run test
```
