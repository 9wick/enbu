# Phase 4: CLI仕様

このドキュメントは `@apps/cli` が提供するコマンドラインインターフェースを定義します。

---

## コマンド一覧

### 基本構文

```bash
npx enbu [command] [options] [flow-files...]
```

### コマンド

| コマンド | 説明 | 例 |
|---------|------|-----|
| `init` | プロジェクト初期化 | `npx enbu init` |
| (なし) | フロー実行（デフォルト） | `npx enbu` |

---

## グローバルオプション

全コマンドで使用可能なオプション。

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `-h, --help` | boolean | - | ヘルプを表示して終了 |
| `-v, --verbose` | boolean | false | 詳細ログを出力 |

---

## initコマンド

プロジェクトを初期化し、必要なディレクトリとサンプルファイルを生成します。

### 構文

```bash
npx enbu init [options]
```

### オプション

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `--force` | boolean | false | 既存ファイルを上書き |

### 動作

1. `.abflow/` ディレクトリを作成（既に存在する場合はスキップ、`--force`時は上書き）
2. サンプルフローファイル `.abflow/example.enbu.yaml` を生成
3. `.gitignore` への追記を提案（対話的確認）

### 生成されるサンプルフロー

`.abflow/example.enbu.yaml`:

```yaml
name: Example Flow
description: enbuのサンプルフロー
steps:
  - action: open
    url: https://example.com
  - action: click
    target: More information...
```

### 出力例

```
Initializing enbu project...
  ✓ Created .abflow/ directory
  ✓ Created .abflow/example.enbu.yaml

Would you like to add .abflow/ to .gitignore? (y/N): y
  ✓ Updated .gitignore

Initialization complete!
Try: npx enbu .abflow/example.enbu.yaml
```

### 終了コード

- `0`: 初期化成功
- `2`: 初期化エラー（ファイルシステムエラー等）

---

## runコマンド（デフォルト）

フローファイルを読み込み、実行します。
コマンド名を省略した場合、このコマンドが実行されます。

### 構文

```bash
npx enbu [options] [flow-files...]
```

### 引数

| 引数 | 説明 | 例 |
|-----|------|-----|
| `flow-files...` | フローファイルのパス（複数可）。指定がない場合は `.abflow/` 配下の全 `.enbu.yaml` ファイルを実行 | `login.enbu.yaml` `checkout.enbu.yaml` |

### オプション

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `--headed` | boolean | false | ブラウザを表示（ヘッドレスモードを無効化） |
| `--env KEY=VALUE` | string[] | - | 環境変数を設定（複数指定可） |
| `--timeout <ms>` | number | 30000 | タイムアウト（ミリ秒） |
| `--screenshot` | boolean | false | 失敗時にスクリーンショットを保存 |
| `--bail` | boolean | false | 最初の失敗で全体を中断 |
| `--session <name>` | string | 自動生成 | agent-browserのセッション名 |

### 環境変数の使用

`--env` オプションで設定した環境変数は、フローファイル内で `${ENV_VAR_NAME}` の形式で参照できます。

```bash
npx enbu login.enbu.yaml --env USERNAME=test@example.com --env PASSWORD=secret123
```

フローファイル内:

```yaml
steps:
  - action: type
    target: メールアドレス
    value: ${USERNAME}
  - action: type
    target: パスワード
    value: ${PASSWORD}
```

### 実行順序

1. agent-browserのインストール確認
2. フローファイルの読み込み
3. 各フローを順次実行（`--bail`が指定されていない限り、失敗しても続行）
4. 結果サマリーの表示

### 出力例

#### 成功時

```
Checking agent-browser...
  ✓ agent-browser is installed

Loading flows...
  ✓ Loaded 2 flow(s)

Running: login.enbu.yaml
  ✓ open https://example.com (1.2s)
  ✓ click "ログイン" (0.3s)
  ✓ type "メールアドレス" (0.2s)
  ✓ type "パスワード" (0.2s)
  ✓ click "ログインする" (0.4s)

✓ PASSED: login.enbu.yaml (2.3s)

Running: checkout.enbu.yaml
  ✓ open https://shop.example.com (1.1s)
  ✓ click "カートに追加" (0.3s)
  ✓ click "購入手続き" (0.5s)

✓ PASSED: checkout.enbu.yaml (1.9s)

────────────────────────────────────────
Summary: 2/2 flows passed (4.2s)
```

#### 失敗時

```
Checking agent-browser...
  ✓ agent-browser is installed

Loading flows...
  ✓ Loaded 1 flow(s)

Running: login.enbu.yaml
  ✓ open https://example.com (1.2s)
  ✓ click "ログイン" (0.3s)
  ✗ type "メールアドレス" (0.5s)
    Error: Element not found: "メールアドレス"

✗ FAILED: login.enbu.yaml (2.0s)
  Step 3 failed: Element not found: "メールアドレス"

────────────────────────────────────────
Summary: 0/1 flows passed (2.0s)

Exit code: 1
```

#### agent-browser未インストール時

```
Checking agent-browser...
  ✗ agent-browser is not installed

Error: agent-browser is not installed
Please install it with: npm install -g agent-browser

Exit code: 2
```

### 終了コード

| コード | 意味 | 説明 |
|-------|------|------|
| `0` | 成功 | 全フローが成功 |
| `1` | フロー失敗 | 1つ以上のフローが失敗 |
| `2` | 実行エラー | agent-browser未インストール、フロー読み込みエラー等 |

---

## 詳細ログモード（--verbose）

`--verbose` または `-v` を指定すると、詳細なログが出力されます。

```bash
npx enbu -v login.enbu.yaml
```

出力例:

```
[DEBUG] Args: { command: 'run', files: ['login.enbu.yaml'], headed: false, verbose: true }
[DEBUG] Checking agent-browser installation...
Checking agent-browser...
  ✓ agent-browser is installed
[DEBUG] Loading flows from: login.enbu.yaml
Loading flows...
  ✓ Loaded 1 flow(s)
[DEBUG] Executing flow: login (3 steps)
Running: login.enbu.yaml
[DEBUG] Step 1: open https://example.com
  ✓ open https://example.com (1.2s)
[DEBUG] Step 2: click "ログイン"
[DEBUG] Executing: agent-browser click "ログイン" --session abf-123 --json
  ✓ click "ログイン" (0.3s)
...
```

---

## コマンドライン引数パースの優先順位

1. コマンド（`init` または省略）
2. オプション（`--` で始まる引数）
3. 位置引数（フローファイルのパス）

### 例

```bash
npx enbu --headed login.enbu.yaml --env USER=test checkout.enbu.yaml
```

パース結果:

```typescript
{
  command: 'run',
  files: ['login.enbu.yaml', 'checkout.enbu.yaml'],
  options: {
    headed: true,
    env: { USER: 'test' },
  }
}
```

---

## エラーメッセージ仕様

### フォーマット

```
Error: <error-type>
<詳細メッセージ>

<解決方法の提案（オプション）>
```

### エラー種別

| エラー型 | メッセージ例 | 提案 |
|---------|------------|------|
| agent-browser未インストール | `agent-browser is not installed` | `Please install it with: npm install -g agent-browser` |
| フローファイル未発見 | `Flow file not found: <path>` | `Check the file path and try again` |
| フローパースエラー | `Failed to parse flow file: <path>` | （YAMLエラーの詳細） |
| フロー実行エラー | `Step <number> failed: <reason>` | （agent-browserのエラーメッセージ） |

---

## 進捗表示の仕様

### 進行中のステップ

実行中のステップはスピナーで表示します（実装は `process.stdout.write` で制御）。

```
Running: login.enbu.yaml
  ⠋ open https://example.com
```

### 完了したステップ

```
  ✓ open https://example.com (1.2s)
```

### 失敗したステップ

```
  ✗ type "メールアドレス" (0.5s)
    Error: Element not found: "メールアドレス"
```

### 記号

| 記号 | 意味 |
|------|------|
| `✓` | 成功 |
| `✗` | 失敗 |
| `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` | スピナー（実行中） |

---

## 標準出力・標準エラー出力の使い分け

| 内容 | 出力先 |
|------|--------|
| 通常の進捗・結果 | `stdout` |
| エラーメッセージ | `stderr` |
| デバッグログ（`--verbose`） | `stderr` |

### 理由

- `stdout` にはパイプ可能な結果のみを出力
- エラーやデバッグ情報は `stderr` に分離することで、CI/CDでのログ処理が容易

---

## 制約事項

### console.log 禁止

CLAUDE.mdの規約に従い、`console.log` の使用は禁止です。
代わりに `process.stdout.write` / `process.stderr.write` を使用してください。

### 色付き出力

本仕様では色付き出力は使用しません（将来的に外部ライブラリで対応可能）。
シンプルなテキストベースの出力のみを実装します。

---

## 内部API（main.ts → commands）

CLIエントリポイント（`main.ts`）から各コマンドを呼び出す際のインターフェース。

```typescript
import type { Result } from 'neverthrow';

/**
 * パース済みCLI引数
 */
export type ParsedArgs = {
  command: 'init' | 'run';
  help: boolean;
  verbose: boolean;
} & (
  | { command: 'init'; force: boolean }
  | {
      command: 'run';
      files: string[];
      headed: boolean;
      env: Record<string, string>;
      timeout: number;
      screenshot: boolean;
      bail: boolean;
      session?: string;
    }
);

/**
 * CLI実行エラー
 */
export type CliError =
  | { type: 'invalid_args'; message: string }
  | { type: 'execution_error'; message: string; cause?: unknown };

/**
 * initコマンド実行
 */
export function runInitCommand(args: {
  force: boolean;
  verbose: boolean;
}): Promise<Result<void, CliError>>;

/**
 * runコマンド実行
 */
export function runFlowCommand(args: {
  files: string[];
  headed: boolean;
  env: Record<string, string>;
  timeout: number;
  screenshot: boolean;
  bail: boolean;
  session?: string;
  verbose: boolean;
}): Promise<Result<{ passed: number; failed: number; total: number }, CliError>>;
```

---

## 使用例

### 基本的な使用

```bash
# 初期化
npx enbu init

# 全フロー実行
npx enbu

# 特定のフロー実行
npx enbu login.enbu.yaml

# 複数フロー実行
npx enbu login.enbu.yaml checkout.enbu.yaml

# ヘッドレスモードを無効化
npx enbu --headed login.enbu.yaml

# 環境変数を設定
npx enbu --env USERNAME=test --env PASSWORD=secret login.enbu.yaml

# 最初の失敗で中断
npx enbu --bail login.enbu.yaml checkout.enbu.yaml

# 詳細ログ
npx enbu -v login.enbu.yaml
```

### CI/CD環境での使用

```bash
# 全フロー実行、失敗時に即終了
npx enbu --bail

# 終了コードでCI判定
npx enbu && echo "All tests passed" || echo "Tests failed"
```
