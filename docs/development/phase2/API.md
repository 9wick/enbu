# Phase 2: 公開API仕様

このドキュメントは `@packages/core` が提供する公開APIを定義します。
**Phase 3以降はこのAPIのみを使用**し、内部実装には依存しません。

---

## エクスポート一覧

```typescript
// packages/core/src/index.ts

// 型
export type {
  Flow,
  Command,
  OpenCommand,
  ClickCommand,
  TypeCommand,
  FillCommand,
  PressCommand,
  HoverCommand,
  SelectCommand,
  ScrollCommand,
  ScrollIntoViewCommand,
  WaitCommand,
  ScreenshotCommand,
  SnapshotCommand,
  EvalCommand,
  AssertVisibleCommand,
  AssertEnabledCommand,
  AssertCheckedCommand,
  FlowEnv,
  ParseError,
} from './types';

// 関数
export { parseFlowYaml } from './parser';
export { resolveEnvVariables } from './parser';
export { loadFlows } from './loader';
```

---

## 型定義

### Flow

フロー全体を表す型。

```typescript
/**
 * フロー定義
 *
 * YAMLファイルから読み込まれたフロー全体を表す。
 * env セクション（オプション）とコマンドシーケンスで構成される。
 */
export type Flow = {
  /** フロー名（ファイル名から取得） */
  name: string;
  /** フロー内で定義された環境変数 */
  env: FlowEnv;
  /** 実行するコマンドのシーケンス */
  steps: readonly Command[];
};
```

### FlowEnv

フロー内で定義される環境変数。

```typescript
/**
 * フロー内の環境変数定義
 *
 * YAMLの env セクションから読み込まれる。
 * 全ての値は文字列として扱われる。
 */
export type FlowEnv = Readonly<Record<string, string>>;
```

### Command

全てのコマンドのユニオン型。

```typescript
/**
 * 全てのコマンド型のユニオン
 *
 * 判別可能なユニオン型として定義され、
 * 各コマンドは command フィールドで判別される。
 */
export type Command =
  | OpenCommand
  | ClickCommand
  | TypeCommand
  | FillCommand
  | PressCommand
  | HoverCommand
  | SelectCommand
  | ScrollCommand
  | ScrollIntoViewCommand
  | WaitCommand
  | ScreenshotCommand
  | SnapshotCommand
  | EvalCommand
  | AssertVisibleCommand
  | AssertEnabledCommand
  | AssertCheckedCommand;
```

### 個別のコマンド型

#### OpenCommand

```typescript
/**
 * ページを開く
 *
 * @example
 * // YAML: - open: https://example.com
 * { command: 'open', url: 'https://example.com' }
 */
export type OpenCommand = {
  command: 'open';
  url: string;
};
```

#### ClickCommand

```typescript
/**
 * 要素をクリック
 *
 * @example
 * // YAML: - click: "ログインボタン"
 * { command: 'click', selector: 'ログインボタン' }
 */
export type ClickCommand = {
  command: 'click';
  selector: string;
};
```

#### TypeCommand

```typescript
/**
 * テキストを入力（既存のテキストをクリアしない）
 *
 * @example
 * // YAML:
 * // - type:
 * //     selector: "検索欄"
 * //     value: "検索キーワード"
 * { command: 'type', selector: '検索欄', value: '検索キーワード' }
 */
export type TypeCommand = {
  command: 'type';
  selector: string;
  value: string;
};
```

#### FillCommand

```typescript
/**
 * フォームにテキストを入力（既存のテキストをクリア）
 *
 * @example
 * // YAML:
 * // - fill:
 * //     selector: "メールアドレス"
 * //     value: "${EMAIL}"
 * { command: 'fill', selector: 'メールアドレス', value: 'user@example.com' }
 */
export type FillCommand = {
  command: 'fill';
  selector: string;
  value: string;
};
```

#### PressCommand

```typescript
/**
 * キーボードキーを押す
 *
 * @example
 * // YAML: - press: Enter
 * { command: 'press', key: 'Enter' }
 */
export type PressCommand = {
  command: 'press';
  key: string;
};
```

#### HoverCommand

```typescript
/**
 * 要素にホバー
 *
 * @example
 * // YAML: - hover: "メニュー項目"
 * { command: 'hover', selector: 'メニュー項目' }
 */
export type HoverCommand = {
  command: 'hover';
  selector: string;
};
```

#### SelectCommand

```typescript
/**
 * セレクトボックスから選択
 *
 * @example
 * // YAML:
 * // - select:
 * //     selector: "国選択"
 * //     value: "日本"
 * { command: 'select', selector: '国選択', value: '日本' }
 */
export type SelectCommand = {
  command: 'select';
  selector: string;
  value: string;
};
```

#### ScrollCommand

```typescript
/**
 * ページをスクロール
 *
 * @example
 * // YAML:
 * // - scroll:
 * //     direction: down
 * //     amount: 500
 * { command: 'scroll', direction: 'down', amount: 500 }
 */
export type ScrollCommand = {
  command: 'scroll';
  direction: 'up' | 'down';
  amount: number;
};
```

#### ScrollIntoViewCommand

```typescript
/**
 * 要素をビューにスクロール
 *
 * @example
 * // YAML: - scrollIntoView: "フッター"
 * { command: 'scrollIntoView', selector: 'フッター' }
 */
export type ScrollIntoViewCommand = {
  command: 'scrollIntoView';
  selector: string;
};
```

#### WaitCommand

```typescript
/**
 * 待機
 *
 * @example
 * // YAML: - wait: 1000
 * { command: 'wait', ms: 1000 }
 *
 * @example
 * // YAML: - wait: "読み込み完了"
 * { command: 'wait', target: '読み込み完了' }
 */
export type WaitCommand = {
  command: 'wait';
} & (
  | { ms: number }
  | { target: string }
);
```

#### ScreenshotCommand

```typescript
/**
 * スクリーンショットを保存
 *
 * @example
 * // YAML: - screenshot: ./result.png
 * { command: 'screenshot', path: './result.png' }
 *
 * @example
 * // YAML:
 * // - screenshot:
 * //     path: ./result.png
 * //     fullPage: true
 * { command: 'screenshot', path: './result.png', fullPage: true }
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: string;
  /** ページ全体のスクリーンショットを撮影（デフォルト: false） */
  fullPage?: boolean;
};
```

#### SnapshotCommand

```typescript
/**
 * ページの構造をスナップショット
 *
 * @example
 * // YAML: - snapshot: {}
 * { command: 'snapshot' }
 */
export type SnapshotCommand = {
  command: 'snapshot';
};
```

#### EvalCommand

```typescript
/**
 * JavaScriptを実行
 *
 * @example
 * // YAML: - eval: "document.title"
 * { command: 'eval', script: 'document.title' }
 */
export type EvalCommand = {
  command: 'eval';
  script: string;
};
```

#### AssertVisibleCommand

```typescript
/**
 * 要素が表示されていることを確認
 *
 * @example
 * // YAML: - assertVisible: "ダッシュボード"
 * { command: 'assertVisible', selector: 'ダッシュボード' }
 */
export type AssertVisibleCommand = {
  command: 'assertVisible';
  selector: string;
};
```

#### AssertEnabledCommand

```typescript
/**
 * 要素が有効化されていることを確認
 *
 * @example
 * // YAML: - assertEnabled: "送信ボタン"
 * { command: 'assertEnabled', selector: '送信ボタン' }
 */
export type AssertEnabledCommand = {
  command: 'assertEnabled';
  selector: string;
};
```

#### AssertCheckedCommand

```typescript
/**
 * チェックボックスがチェックされていることを確認
 *
 * @example
 * // YAML: - assertChecked: "利用規約に同意"
 * { command: 'assertChecked', selector: '利用規約に同意' }
 */
export type AssertCheckedCommand = {
  command: 'assertChecked';
  selector: string;
};
```

### ParseError

パース時のエラー型。

```typescript
/**
 * フローパース時のエラー型
 *
 * 全てのエラーケースを網羅する判別可能なユニオン型。
 */
export type ParseError =
  | {
      /** YAMLの構文エラー */
      type: 'yaml_syntax_error';
      message: string;
      line?: number;
      column?: number;
    }
  | {
      /** フロー構造が不正 */
      type: 'invalid_flow_structure';
      message: string;
      details?: string;
    }
  | {
      /** コマンド形式が不正 */
      type: 'invalid_command';
      message: string;
      commandIndex: number;
      commandContent: unknown;
    }
  | {
      /** 環境変数が未定義 */
      type: 'undefined_variable';
      message: string;
      variableName: string;
      location: string;
    }
  | {
      /** ファイル読み込みエラー */
      type: 'file_read_error';
      message: string;
      filePath: string;
      cause?: string;
    };
```

---

## 関数仕様

### parseFlowYaml

単一のYAMLファイルをパースしてFlowオブジェクトに変換します。

```typescript
import { Result } from 'neverthrow';

/**
 * YAMLファイルをパースしてFlowオブジェクトに変換する
 *
 * @param yamlContent - YAMLファイルの内容
 * @param fileName - ファイル名（フロー名として使用）
 * @returns 成功時: Flowオブジェクト、失敗時: ParseError
 *
 * @example
 * const yamlContent = `
 * env:
 *   BASE_URL: https://example.com
 * ---
 * - open: \${BASE_URL}
 * - click: "ログイン"
 * `;
 *
 * const result = parseFlowYaml(yamlContent, 'login.enbu.yaml');
 * result.match(
 *   (flow) => console.log(flow.steps),
 *   (error) => console.error(error)
 * );
 */
export function parseFlowYaml(
  yamlContent: string,
  fileName: string
): Result<Flow, ParseError>;
```

**動作仕様**:

1. YAMLを2つのドキュメントに分割（`---` 区切り）
2. 最初のドキュメントが存在する場合、`env` セクションとして解釈
3. 最後のドキュメントをコマンド配列として解釈
4. 各コマンドを型検証して `Command` 型に変換
5. 成功 → `ok({ name, env, steps })`
6. 失敗 → `err(ParseError)`

**エラーケース**:
- YAML構文エラー → `yaml_syntax_error`
- コマンド配列が存在しない → `invalid_flow_structure`
- コマンド形式が不正 → `invalid_command`

---

### resolveEnvVariables

フロー内の環境変数参照（${VAR}）を実際の値に展開します。

```typescript
import { Result } from 'neverthrow';

/**
 * フロー内の環境変数参照を解決する
 *
 * @param flow - パース済みのFlowオブジェクト
 * @param processEnv - プロセス環境変数（process.env）
 * @param dotEnv - .envファイルから読み込んだ環境変数
 * @returns 成功時: 環境変数が展開されたFlow、失敗時: ParseError
 *
 * @example
 * const flow: Flow = {
 *   name: 'login',
 *   env: { BASE_URL: 'https://example.com' },
 *   steps: [
 *     { command: 'open', url: '${BASE_URL}' },
 *     { command: 'fill', selector: 'password', value: '${PASSWORD}' }
 *   ]
 * };
 *
 * const result = resolveEnvVariables(
 *   flow,
 *   process.env,
 *   { PASSWORD: 'secret' }
 * );
 *
 * result.match(
 *   (resolved) => {
 *     // resolved.steps[0] = { command: 'open', url: 'https://example.com' }
 *     // resolved.steps[1] = { command: 'fill', selector: 'password', value: 'secret' }
 *   },
 *   (error) => console.error(error)
 * );
 */
export function resolveEnvVariables(
  flow: Flow,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>
): Result<Flow, ParseError>;
```

**動作仕様**:

1. 環境変数の優先順位を決定:
   - processEnv > dotEnv > flow.env
2. 全てのコマンドのプロパティを走査
3. 文字列値に含まれる `${VAR}` を検出
4. 優先順位に従って変数を解決
5. 全ての変数が解決できた → `ok(resolvedFlow)`
6. 未定義の変数が存在 → `err({ type: 'undefined_variable', ... })`

**変数展開のルール**:
- `${VAR}` 形式のみサポート（`$VAR` は非サポート）
- 複数の変数を含む文字列もサポート: `"${PROTOCOL}://${HOST}:${PORT}"`
- 未定義変数はエラーとして扱う（空文字列には展開しない）

---

### loadFlows

指定されたディレクトリから全てのフローファイルを読み込みます。

```typescript
import { Result } from 'neverthrow';

/**
 * ディレクトリから全てのフローファイルを読み込む
 *
 * @param dirPath - フローファイルが配置されたディレクトリのパス
 * @param options - オプション
 * @returns 成功時: Flowオブジェクトの配列、失敗時: ParseError
 *
 * @example
 * const result = await loadFlows('./.abflow', {
 *   processEnv: process.env,
 *   dotEnvPath: './.env'
 * });
 *
 * result.match(
 *   (flows) => {
 *     flows.forEach((flow) => {
 *       console.log(`Loaded flow: ${flow.name}`);
 *     });
 *   },
 *   (error) => console.error(error)
 * );
 */
export function loadFlows(
  dirPath: string,
  options?: {
    /** プロセス環境変数（デフォルト: process.env） */
    processEnv?: Readonly<Record<string, string | undefined>>;
    /** .envファイルのパス（デフォルト: .env） */
    dotEnvPath?: string;
  }
): Promise<Result<readonly Flow[], ParseError>>;
```

**動作仕様**:

1. `dotEnvPath` が指定されている場合、dotenvで読み込み
2. `dirPath` 配下の `*.enbu.yaml` ファイルを全て検索
3. 各ファイルを読み込み、`parseFlowYaml` でパース
4. 全てのフローに対して `resolveEnvVariables` を実行
5. 全て成功 → `ok([flow1, flow2, ...])`
6. いずれかが失敗 → `err(ParseError)`（最初のエラーを返す）

**ファイル検索ルール**:
- `*.enbu.yaml` パターンにマッチするファイルのみ
- サブディレクトリは検索しない（シャロー検索）
- ファイル名順にソート

---

## 使用例（Phase 3以降向け）

### 基本的なフロー読み込み

```typescript
import { loadFlows } from '@packages/core';

// フローファイルを全て読み込み
const result = await loadFlows('./.abflow', {
  processEnv: process.env,
  dotEnvPath: './.env'
});

result.match(
  (flows) => {
    console.log(`Loaded ${flows.length} flows`);
    flows.forEach((flow) => {
      console.log(`- ${flow.name}: ${flow.steps.length} steps`);
    });
  },
  (error) => {
    switch (error.type) {
      case 'file_read_error':
        console.error(`Failed to read: ${error.filePath}`);
        break;
      case 'yaml_syntax_error':
        console.error(`YAML syntax error at line ${error.line}: ${error.message}`);
        break;
      case 'undefined_variable':
        console.error(`Undefined variable: ${error.variableName} in ${error.location}`);
        break;
      default:
        console.error(error.message);
    }
  }
);
```

### 単一ファイルのパースと環境変数解決

```typescript
import { parseFlowYaml, resolveEnvVariables } from '@packages/core';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';

// .envファイル読み込み
const dotEnv = dotenv.config().parsed ?? {};

// YAMLファイル読み込み
const yamlContent = await readFile('./.abflow/login.enbu.yaml', 'utf-8');

// パース
const parseResult = parseFlowYaml(yamlContent, 'login.enbu.yaml');

// 環境変数解決
const resolvedResult = parseResult.andThen((flow) =>
  resolveEnvVariables(flow, process.env, dotEnv)
);

resolvedResult.match(
  (flow) => {
    // 実行可能なフローオブジェクト
    console.log(flow.steps);
  },
  (error) => console.error(error)
);
```

### コマンド型による分岐処理

```typescript
import type { Command } from '@packages/core';

const processCommand = (command: Command): void => {
  // 判別可能なユニオン型として型安全に処理
  switch (command.command) {
    case 'open':
      console.log(`Open: ${command.url}`);
      break;
    case 'click':
      console.log(`Click: ${command.selector}`);
      break;
    case 'type':
      console.log(`Type: "${command.value}" into ${command.selector}`);
      break;
    case 'fill':
      console.log(`Fill: "${command.value}" into ${command.selector}`);
      break;
    case 'wait':
      if ('ms' in command) {
        console.log(`Wait: ${command.ms}ms`);
      } else {
        console.log(`Wait: for "${command.target}"`);
      }
      break;
    // ... 他のコマンドも同様
  }
};

flow.steps.forEach(processCommand);
```

---

## 注意事項

### 環境変数の優先順位

環境変数は以下の優先順位で解決されます:

1. **プロセス環境変数** (`process.env`)
2. **.envファイル** (`dotenv`)
3. **フロー内のenv** (YAMLの `env` セクション)

同じ変数名が複数のソースに存在する場合、優先度の高いソースの値が使用されます。

### 環境変数の形式

- サポート: `${VAR}` 形式
- 非サポート: `$VAR` 形式（展開されない）
- 非サポート: デフォルト値 `${VAR:-default}` 形式

### コマンドの型安全性

全てのコマンドは判別可能なユニオン型として定義されています。
TypeScriptの型ガード（`switch`文や`command.command`による判別）を使用して、型安全に処理できます。

```typescript
// 正しい: command フィールドで判別
switch (command.command) {
  case 'open':
    // command は OpenCommand として推論される
    command.url;
    break;
}

// または
if (command.command === 'open') {
  // command は OpenCommand として推論される
  command.url;
}

// 間違い: 型アサーションは使わない
(command as OpenCommand).url; // 危険
```

### エラーハンドリング

```typescript
result.match(
  (flows) => { /* 成功 */ },
  (error) => {
    switch (error.type) {
      case 'yaml_syntax_error':
        // YAML構文エラー: line, column を表示
        console.error(`YAML error at ${error.line}:${error.column}`);
        break;
      case 'invalid_command':
        // 不正なコマンド: commandIndex を表示
        console.error(`Invalid command at index ${error.commandIndex}`);
        break;
      case 'undefined_variable':
        // 未定義変数: variableName, location を表示
        console.error(`Variable "${error.variableName}" is undefined in ${error.location}`);
        break;
      case 'file_read_error':
        // ファイル読み込みエラー: filePath を表示
        console.error(`Cannot read file: ${error.filePath}`);
        break;
      case 'invalid_flow_structure':
        // フロー構造エラー: details を表示
        console.error(`Invalid flow: ${error.message}`, error.details);
        break;
    }
  }
);
```
