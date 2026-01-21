# コマンドデータフロー設計書

このドキュメントは、YAMLコマンド入力から最終結果（step ok/error）までの全レイヤーを通るデータフローと、各層の責務・型確定基準を定義する。

**目的**: 全コマンドに適用する共通契約を定義し、Clickコマンドの理想実装をリファレンスとして示す。

---

## 1. 層の責務と共通契約

### 1.1 層の責務一覧

| 層 | 責務 | 入力型 | 出力型 |
|----|------|--------|--------|
| **LOADER** | ファイル読み込み | `string` (filePath) | `string` (yamlContent) |
| **PARSER** | YAML解析・検証・型確定 | `string` (yaml) | `Command[]` (Branded Type) |
| **EXECUTOR** | コマンド実行・結果構築 | `Command` (Branded Type) | `StepResult` |
| **ADAPTER** | 外部CLI呼び出し・戻り値検証 | `CliSelector` 等 | `EmptyData` / `SnapshotData` 等 |

### 1.2 共通契約（必須ルール）

#### LOADER層の契約

| 契約 | 内容 |
|------|------|
| **責務** | ファイルシステムからYAMLコンテンツを読み込む |
| **入力** | ファイルパス（string） |
| **出力** | YAMLコンテンツ（string）またはエラー |
| **禁止事項** | YAMLの解析・検証を行わない |

#### PARSER層の契約

| 契約 | 内容 |
|------|------|
| **責務** | YAML解析、環境変数解決、コマンド検証、型確定 |
| **入力** | YAMLコンテンツ（string） |
| **出力** | `Flow`（`Command[]`を含む）。全コマンドはBranded Type |
| **型確定** | PARSER層完了時点で全てのコマンドがBranded Typeとして確定 |
| **禁止事項** | 副作用（ファイルI/O、ネットワーク、ブラウザ操作）を行わない |
| **禁止事項** | EXECUTOR層に検証を委譲しない（PARSER層で検証完了） |

#### EXECUTOR層の契約

| 契約 | 内容 |
|------|------|
| **責務** | コマンド実行、CLIセレクタ変換、結果構築 |
| **入力** | `Command`（Branded Type確定済み） |
| **出力** | `StepResult` / `FlowResult` |
| **前提** | 入力は検証済み。再検証しない |
| **禁止事項** | コマンドの形式・format検証を行わない（PARSER層で完了済み） |
| **許可事項** | CLIセレクタへの変換（内部型→CLI形式）、autoWait処理 |

#### ADAPTER層の契約

| 契約 | 内容 |
|------|------|
| **責務** | 外部CLI（agent-browser）の呼び出しと戻り値検証 |
| **入力** | CLI引数（CliSelector等、型安全な値） |
| **出力** | 検証済みデータ（`EmptyData`, `SnapshotData`等）またはエラー |
| **戻り値検証** | JSON形式、success/data/error構造、dataスキーマの3段階検証 |
| **禁止事項** | コマンドの解釈・ビジネスロジックを持たない |

### 1.3 検証の一回性原則

**原則**: 各検証は一度だけ行い、後続の層では再検証しない。

| 検証項目 | 実行層 | 後続層での扱い |
|----------|--------|----------------|
| YAML構文 | PARSER | 再検証しない |
| コマンド形式 | PARSER | 再検証しない |
| セレクタformat | PARSER | 再検証しない |
| Branded Type化 | PARSER | 型として保証される |
| CLI戻り値構造 | ADAPTER | EXECUTOR層で再検証しない |

---

## 2. 型確定の基準

### 2.1 型確定のタイミング

| 型カテゴリ | 確定タイミング | 確定後の保証 |
|------------|----------------|--------------|
| **Command型** | PARSER層完了時 | Branded Type（形式・format検証済み） |
| **セレクタ型** | PARSER層完了時 | CssSelector, RefSelector, TextSelector, XpathSelector |
| **CliSelector型** | EXECUTOR層（変換時） | CliTextSelector, CliXpathSelector |
| **戻り値型** | ADAPTER層 | EmptyData, SnapshotData等（スキーマ検証済み） |

### 2.2 Branded Types の必須制約

全てのBranded Typeは以下を満たすこと：

| 要件 | 説明 | 例 |
|------|------|-----|
| **空文字禁止** | 全てのセレクタ型は空文字列を許可しない | `minLength(1)` |
| **形式制約** | 型の意味に応じた形式制約を持つ | RefSelector: `^@[a-zA-Z0-9]+$` |
| **valibotスキーマ** | Single Source of Truthとしてvalibotで定義 | `v.brand('CssSelector')` |

#### セレクタ型の制約定義

| 型 | 制約 | 理由 |
|----|------|------|
| `CssSelector` | `^[a-zA-Z#.[:*]` で始まる | CSS構文として有効な先頭文字 |
| `RefSelector` | `^@[a-zA-Z0-9]+$` | snapshot参照の形式 |
| `TextSelector` | 空でない文字列 | 任意のテキスト検索 |
| `XpathSelector` | `^/` で始まる | XPath構文 |
| `CliTextSelector` | `^text=.+$` | agent-browser CLI形式 |
| `CliXpathSelector` | `^xpath=/.+$` | agent-browser CLI形式 |

---

## 3. 1段階検証の必須構成要素

### 3.1 1段階検証とは

全コマンドは以下の要素を**1つのvalibotスキーマ**で同時に実行する：

| 構成要素 | 説明 | 必須 |
|----------|------|------|
| **形式検証** | YAMLの構造が正しいか | 必須 |
| **format検証** | 値の形式が正しいか（正規表現等） | 必須 |
| **Branded Type化** | 型安全なBranded Typeに変換 | 必須 |
| **transform** | YAML形式からCommand形式への変換 | 必須 |
| **metadata** | ドキュメント生成用の情報 | 推奨 |

### 3.2 スキーマ構成のテンプレート

```typescript
// コマンドスキーマの必須構成
const XxxYamlSchema = v.pipe(
  // 1. 形式検証: オブジェクト構造
  v.object({
    xxx: /* セレクタまたは値のスキーマ */,
  }),
  // 2. metadata: ドキュメント生成用（推奨）
  v.metadata({ description: '...', category: '...' }),
  // 3. transform: Command形式への変換
  v.transform((input): XxxCommand => ({
    command: 'xxx',
    ...input,
  })),
);

// セレクタスキーマの必須構成
const SelectorSchema = v.pipe(
  v.string(),
  v.minLength(1, 'エラーメッセージ'),     // 空文字禁止
  v.regex(/^.../, 'エラーメッセージ'),     // format検証
  v.brand('SelectorName'),                 // Branded Type化
);
```

### 3.3 コマンド移行チェックリスト

コマンドを1段階検証に移行する際のチェックリスト：

- [ ] valibotスキーマで形式検証を実装
- [ ] valibotスキーマでformat検証を実装（該当する場合）
- [ ] valibotスキーマでBranded Type化を実装
- [ ] valibotスキーマでtransformを実装
- [ ] normalizer関数がスキーマを使用するよう変更
- [ ] `toBrandedCommand`からそのコマンドの分岐を削除（そのまま返す）
- [ ] `RawXxxCommand`型を廃止
- [ ] テストを追加

---

## 4. ADAPTER層の検証範囲

### 4.1 戻り値検証の3段階

全てのADAPTER層コマンドは以下の3段階検証を行う：

| 段階 | 検証内容 | 失敗時のエラー型 |
|------|----------|------------------|
| **1. JSON解析** | 文字列がJSONとして有効か | `parse_error` |
| **2. 構造検証** | `{ success, data, error }` 形式か | `agent_browser_output_parse_error` |
| **3. データ検証** | `data`がコマンド固有のスキーマに合致するか | `agent_browser_output_parse_error` |

### 4.2 コマンド別の戻り値スキーマ

| コマンドカテゴリ | 戻り値型 | スキーマ |
|------------------|----------|----------|
| **操作系** (click, type, fill, press, hover, scroll, select) | `EmptyData` | `{}` |
| **状態取得系** (snapshot) | `SnapshotData` | `{ elements: Element[], url: string }` |
| **判定系** (is visible, is enabled, is checked) | `IsXxxData` | `{ visible: boolean }` 等 |
| **待機系** (wait) | `EmptyData` | `{}` |
| **ナビゲーション系** (open) | `EmptyData` | `{}` |
| **評価系** (eval) | `EvalData` | `{ result: unknown }` |
| **スクリーンショット系** (screenshot) | `ScreenshotData` | `{ path: string }` |

### 4.3 エラー出力の構造保証

失敗時の出力も検証する：

```typescript
// 失敗時の出力構造
type FailureOutput = {
  success: false;
  data: null;
  error: string;  // エラーメッセージ（空でない文字列）
};
```

---

## 5. 全体フロー概要

```
YAML入力
    │
    ▼
[1] LOADER層 ─────────────── ファイル読み込み
    │
    ▼
[2] PARSER層 - YAML解析 ──── yaml.parse()
    │
    ▼
[3] PARSER層 - 環境変数解決 ─ ${VAR} 置換
    │
    ▼
[4] PARSER層 - コマンド検証 ─ valibot スキーマ（1段階検証）
    │                         形式検証 + format検証 + Branded Type化 + transform
    ▼
[5] PARSER層 - Command確定 ── Branded Type として確定
    │                         ※ここで全検証が完了
    ▼
[6] EXECUTOR層 - ステップ実行
    │                         ※入力は検証済み、再検証しない
    ▼
[7] EXECUTOR層 - ハンドラ ─── CLIセレクタ変換（内部型→CLI形式）
    │
    ▼
[8] ADAPTER層 ────────────── spawn('npx agent-browser ...')
    │
    ▼
[9] AGENT-BROWSER ────────── ブラウザ操作（外部CLI）
    │
    ▼
[10] ADAPTER層 - 戻り値検証 ─ 3段階検証（JSON→構造→データ）
    │
    ▼
[11] EXECUTOR層 - StepResult構築
    │
    ▼
[12] EXECUTOR層 - FlowResult集約
```

---

## 6. Clickコマンド データフロー（リファレンス実装）

### 6.1 入力例

```yaml
env:
  BASE_URL: http://localhost:3000
steps:
  - click: "ログイン"           # 簡略形式
  - click:                      # 詳細形式
      css: "#submit-button"
```

---

### 6.2 各層の型遷移

#### [1] LOADER層

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `loader/flow-loader.ts:80` | `loadSingleFlow()` | `string` (filePath) | `ResultAsync<Flow, ParseError>` |

```typescript
// 処理: ファイル読み込み（UTF-8）
const yamlContent: string = await fs.readFile(filePath, 'utf-8');
```

---

#### [2] PARSER層 - YAML解析

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `parser/yaml-parser.ts:428` | `parseFlowYaml()` | `string` (yaml) | `Result<Flow, ParseError>` |
| `parser/yaml-parser.ts:72` | `safeYamlParse()` | `string` | `Result<unknown, ParseError>` |
| `parser/yaml-parser.ts:413` | `buildRawFlowData()` | `Record<string, unknown>` | `RawFlowData` |

```typescript
// yaml.parse() 後の状態
type RawFlowData = {
  env: Record<string, string>;
  steps: unknown[];  // 未検証
};

// 値の例
{
  env: { BASE_URL: 'http://localhost:3000' },
  steps: [
    { click: 'ログイン' },           // unknown
    { click: { css: '#submit-button' } }  // unknown
  ]
}
```

---

#### [3] PARSER層 - 環境変数解決

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `parser/env-resolver.ts` | `resolveEnvVariables()` | `RawFlowData` | `Result<RawFlowData, ParseError>` |

```typescript
// ${VAR} の文字列置換
// steps内のテキスト値に含まれる環境変数を展開
```

---

#### [4] PARSER層 - コマンド検証（1段階検証）

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `parser/validators/command-validator.ts:498` | `validateCommand()` | `unknown` | `Result<Command, ParseError>` |
| `parser/validators/normalizers/click.ts:23` | `normalizeClickCommand()` | `unknown` | `ClickCommand \| null` |
| `parser/schemas/commands/click.schema.ts:140` | `ClickYamlSchema` | `unknown` | `ClickCommand` |

**Clickは1段階検証を満たす**:

valibotスキーマで以下を同時に実行:
1. 形式検証（YAMLの構造が正しいか）
2. format検証（セレクタ形式が正しいか）
3. Branded Type化（型安全なセレクタ型に変換）
4. transform（YAML形式からCommand形式への変換）

```typescript
// スキーマ定義（簡略形式）
const ClickShorthandSchema = v.pipe(
  v.object({
    click: v.pipe(
      TextBrandedSchema,  // format検証 + Branded Type化
      v.metadata({ exampleValues: ['ログイン', '送信ボタン'] }),
    ),
  }),
  v.metadata({ description: 'テキストで要素を指定してクリック' }),
  v.transform(
    (input): ClickWithText => ({
      command: 'click',
      text: input.click,  // TextSelector (Branded Type)
    }),
  ),
);

// スキーマ定義（詳細形式）
const ClickDetailedSchema = v.pipe(
  v.object({
    click: SelectorSpecSchema,  // css/ref/text/xpath のいずれか
  }),
  v.metadata({ description: 'セレクタで要素を指定してクリック' }),
  v.transform((input): ClickWith* => ({
    command: 'click',
    ...input.click,  // Branded Type化済みセレクタ
  })),
);
```

**型の変遷:**

```typescript
// 入力（簡略形式）
{ click: "ログイン" }
// ↓ ClickYamlSchema.safeParse()
// 出力
{
  command: 'click',
  text: 'ログイン' as TextSelector  // Branded Type
}

// 入力（詳細形式）
{ click: { css: "#submit-button" } }
// ↓ ClickYamlSchema.safeParse()
// 出力
{
  command: 'click',
  css: '#submit-button' as CssSelector  // Branded Type
}
```

---

#### [5] PARSER層 - Command確定

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `parser/validators/command-validator.ts:452` | `toBrandedCommand()` | `RawCommand` | `Result<Command, ParseError>` |

**Clickは再検証不要（既にBranded Type）:**

```typescript
const toBrandedCommand = (raw: RawCommand, commandIndex: number): Result<Command, ParseError> => {
  // Clickは既にBranded Type（ClickCommand）なのでそのまま返す
  if (raw.command === 'click') {
    return ok(raw);
  }
  // 他のコマンドは2段階目の検証が必要（将来的に1段階化予定）
  // ...
};
```

**確定した型:**

```typescript
// ClickCommand の型定義（types/commands.ts から導出）
type ClickCommand =
  | { command: 'click'; text: TextSelector }
  | { command: 'click'; css: CssSelector }
  | { command: 'click'; ref: RefSelector }
  | { command: 'click'; xpath: XpathSelector };

// Branded Types（agent-browser-adapter/src/types.ts）
type TextSelector = string & { __brand: 'TextSelector' };
type CssSelector = string & { __brand: 'CssSelector' };
type RefSelector = string & { __brand: 'RefSelector' };
type XpathSelector = string & { __brand: 'XpathSelector' };
```

---

#### [6] EXECUTOR層 - ステップ実行

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `executor/flow-executor.ts:175` | `executeAllSteps()` | `Flow, ExecutionContext` | `ExecuteAllStepsResult` |
| `executor/execute-step.ts:232` | `executeStep()` | `Command, index, context` | `Promise<StepResult>` |

```typescript
// executeStep内の処理フロー
// ※入力Commandは検証済み、再検証しない
1. processAutoWait()     // refセレクタの場合、要素待機
2. getCommandHandler()   // 'click' → handleClick を取得
3. handler(command, context)  // ハンドラ実行
```

---

#### [7] EXECUTOR層 - Clickハンドラ

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `executor/commands/interaction.ts:29` | `handleClick()` | `ClickCommand, ExecutionContext` | `ResultAsync<CommandResult, AgentBrowserError>` |
| `executor/commands/cli-selector-utils.ts:121` | `resolveCliSelector()` | `SelectorSpec, ExecutionContext` | `ResultAsync<CliSelector, AgentBrowserError>` |

**CLIセレクタ変換:**

内部セレクタ型とCLI形式セレクタ型は明確に分離されている:

- **内部セレクタ型**: `TextSelector`, `XpathSelector` - YAMLで指定された生の値
- **CLI形式セレクタ型**: `CliTextSelector`, `CliXpathSelector` - agent-browser CLIに渡す形式

```typescript
// 内部セレクタ型 → CLI形式セレクタ型
{ text: 'ログイン' as TextSelector }
// ↓ resolveCliSelector() で asCliTextSelector() を使用
'text=ログイン' as CliTextSelector  // CLI形式（agent-browserが理解する形式）

{ css: '#submit-button' as CssSelector }
// ↓
'#submit-button' as CssSelector  // CSSセレクタはそのまま

{ ref: '@e1' as RefSelector }
// ↓
'@e1' as RefSelector  // Refセレクタはそのまま

{ xpath: '//button' as XpathSelector }
// ↓ resolveCliSelector() で asCliXpathSelector() を使用
'xpath=//button' as CliXpathSelector  // XPath形式
```

**CliSelector型の定義（agent-browser-adapter/src/types.ts）:**

```typescript
// CLIに渡せるセレクタの統合型
type CliSelector = CssSelector | RefSelector | CliTextSelector | CliXpathSelector;

// CssSelector, RefSelector: プレフィックス不要でそのまま渡せる
// CliTextSelector: "text=" プレフィックス付き
// CliXpathSelector: "xpath=" プレフィックス付き
```

---

#### [8] ADAPTER層 - CLI実行

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `agent-browser-adapter/src/commands/interaction.ts:40` | `browserClick()` | `CliSelector, ExecuteOptions` | `ResultAsync<EmptyData, AgentBrowserError>` |
| `agent-browser-adapter/src/executor.ts:24` | `executeCommand()` | `command, args[], options` | `ResultAsync<string, AgentBrowserError>` |

```typescript
// browserClick の実装
export const browserClick = (
  selector: CliSelector,
  options?: ExecuteOptions,
): ResultAsync<EmptyData, AgentBrowserError> =>
  executeCommand('click', [selector, '--json'], options)
    .andThen((stdout) => validateAndExtractData(stdout, EmptyDataSchema, 'click'));

// 実行されるコマンド
spawn('npx', ['agent-browser', 'click', 'text=ログイン', '--json', '--session', sessionName]);
```

---

#### [9] AGENT-BROWSER（外部CLI）

```bash
$ npx agent-browser click "text=ログイン" --json --session <sessionName>

# 成功時の出力
{"success":true,"data":{},"error":null}

# 失敗時の出力
{"success":false,"data":null,"error":"Element not found: text=ログイン"}
```

---

#### [10] ADAPTER層 - 戻り値検証

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `agent-browser-adapter/src/validator.ts:123` | `validateAndExtractData()` | `string, Schema, command` | `Result<T, AgentBrowserError>` |

```typescript
// 3段階検証
parseJsonOutput(stdout)                              // 段階1: string → unknown
  .andThen((parsed) => validateSchema(parsed, ...))  // 段階2: unknown → AgentBrowserJsonOutput
  .andThen((output) => extractData(output, ...));    // 段階3: AgentBrowserJsonOutput → T

// 各段階の型
type AgentBrowserJsonOutput<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

// Clickの場合、dataは空オブジェクト
type EmptyData = Record<string, never>;  // {}
```

---

#### [11] EXECUTOR層 - StepResult構築

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `executor/execute-step.ts:259` | (result.match) | `ResultAsync<CommandResult, AgentBrowserError>` | `StepResult` |

```typescript
// 成功時
{
  index: 0,
  command: { command: 'click', text: 'ログイン' as TextSelector },
  status: 'passed',
  duration: 245,  // ms
  stdout: '{"success":true,"data":{},"error":null}'
}

// 失敗時
{
  index: 0,
  command: { command: 'click', text: 'ログイン' as TextSelector },
  status: 'failed',
  duration: 30145,
  error: {
    message: 'Element not found: text=ログイン',
    type: 'command_execution_failed',
    screenshot: { status: 'captured', path: '/path/to/error.png' }
  }
}
```

---

#### [12] EXECUTOR層 - FlowResult集約

| ファイル | 関数 | 入力型 | 出力型 |
|---------|------|--------|--------|
| `executor/flow-executor.ts:58` | `buildFailedFlowResult()` | `...` | `FailedFlowResult` |
| `executor/flow-executor.ts:89` | `buildSuccessFlowResult()` | `...` | `PassedFlowResult` |

```typescript
// 成功時
type PassedFlowResult = {
  flow: Flow;
  sessionName: string;
  status: 'passed';
  duration: number;
  steps: StepResult[];
};

// 失敗時
type FailedFlowResult = {
  flow: Flow;
  sessionName: string;
  status: 'failed';
  duration: number;
  steps: StepResult[];  // 最初の失敗ステップまで
  error: {
    message: string;
    stepIndex: number;
    screenshot: ScreenshotResult;
  };
};
```

---

## 7. 型遷移サマリー（Click "ログイン"）

| 段階 | 層 | 型 | 値 |
|------|----|----|-----|
| 1 | YAML入力 | `unknown` | `{ click: "ログイン" }` |
| 2 | スキーマ検証 | `ClickCommand` | `{ command: 'click', text: 'ログイン' as TextSelector }` |
| 3 | CLIセレクタ変換 | `CliTextSelector` | `'text=ログイン'` |
| 4 | CLI実行 | `string[]` | `['click', 'text=ログイン', '--json']` |
| 5 | agent-browser出力 | `string` | `'{"success":true,"data":{},"error":null}'` |
| 6 | 検証後 | `EmptyData` | `{}` |
| 7 | CommandResult | `CommandResult` | `{ stdout: '...', data: {} }` |
| 8 | StepResult | `StepResult` | `{ status: 'passed', duration: 245, ... }` |
| 9 | FlowResult | `FlowResult` | `{ status: 'passed', steps: [...], ... }` |

---

## 8. Branded Types 定義

### 8.1 セレクタ型（agent-browser-adapter/src/types.ts）

```typescript
// CSSセレクタ
// 形式: タグ名、#、.、[、:、* のいずれかで始まる
export const CssSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'CSSセレクタは空文字列にできません'),
  valibot.regex(
    /^[a-zA-Z#.[:*]/,
    'CSSセレクタはタグ名、#、.、[、:、* のいずれかで始まる必要があります',
  ),
  valibot.brand('CssSelector'),
);
export type CssSelector = valibot.InferOutput<typeof CssSelectorSchema>;

// Refセレクタ
// 形式: @で始まり英数字が続く（例: @e1, @login）
export const RefSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^@[a-zA-Z0-9]+$/, 'RefSelectorは@で始まり英数字が続く形式です'),
  valibot.brand('RefSelector'),
);
export type RefSelector = valibot.InferOutput<typeof RefSelectorSchema>;

// Textセレクタ
// 形式: 空でない文字列（任意のテキスト検索に使用）
export const TextSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'TextSelectorは空文字列にできません'),
  valibot.brand('TextSelector'),
);
export type TextSelector = valibot.InferOutput<typeof TextSelectorSchema>;

// XPathセレクタ
// 形式: / で始まる（XPath構文）
export const XpathSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.minLength(1, 'XPathセレクタは空文字列にできません'),
  valibot.regex(/^\//, 'XPathセレクタは / で始まる必要があります'),
  valibot.brand('XpathSelector'),
);
export type XpathSelector = valibot.InferOutput<typeof XpathSelectorSchema>;
```

### 8.2 CLI形式セレクタ型（agent-browser-adapter/src/types.ts）

内部セレクタ型とCLI形式セレクタ型は明確に分離:

```typescript
// CLI形式テキストセレクタ
// 形式: "text=" で始まる
export const CliTextSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^text=.+$/, 'CliTextSelectorは "text=" で始まる必要があります'),
  valibot.brand('CliTextSelector'),
);
export type CliTextSelector = valibot.InferOutput<typeof CliTextSelectorSchema>;

// CLI形式XPathセレクタ
// 形式: "xpath=/" で始まる
export const CliXpathSelectorSchema = valibot.pipe(
  valibot.string(),
  valibot.regex(/^xpath=\/.+$/, 'CliXpathSelectorは "xpath=/" で始まる必要があります'),
  valibot.brand('CliXpathSelector'),
);
export type CliXpathSelector = valibot.InferOutput<typeof CliXpathSelectorSchema>;

// CLIに渡せるセレクタの統合型
export type CliSelector = CssSelector | RefSelector | CliTextSelector | CliXpathSelector;
```

**セレクタ型の対応関係:**

| 内部型 | CLI型 | 変換 |
|--------|-------|------|
| `CssSelector` | `CssSelector` | そのまま |
| `RefSelector` | `RefSelector` | そのまま |
| `TextSelector` | `CliTextSelector` | `asCliTextSelector("text=" + value)` |
| `XpathSelector` | `CliXpathSelector` | `asCliXpathSelector("xpath=" + value)` |

### 8.3 その他のBranded Types

```typescript
// URL
export type Url = string & { __brand: 'Url' };

// ファイルパス
export type FilePath = string & { __brand: 'FilePath' };

// キーボードキー
export type KeyboardKey = string & { __brand: 'KeyboardKey' };

// JavaScript式
export type JsExpression = string & { __brand: 'JsExpression' };
```

---

## 9. エラー型

```typescript
// パース層のエラー
type ParseError = {
  type: 'parse_error';
  message: string;
  location?: { line: number; column: number };
  raw?: unknown;
};

// agent-browser-adapter層のエラー
type AgentBrowserError =
  | { type: 'not_installed'; message: string }
  | { type: 'command_failed'; message: string; exitCode: number; stderr: string; rawError: string | null }
  | { type: 'command_execution_failed'; message: string; command: string; rawError: string }
  | { type: 'timeout'; command: string; args: readonly string[]; timeoutMs: number }
  | { type: 'parse_error'; message: string; rawOutput: string }
  | { type: 'agent_browser_output_parse_error'; message: string; command: string; issues: readonly v.BaseIssue<unknown>[]; rawOutput: string }
  | BrandValidationError;
```

---

## 10. ファイル構成

```
packages/core/src/
├── loader/
│   └── flow-loader.ts          # ファイル読み込み
├── parser/
│   ├── yaml-parser.ts          # YAMLパース
│   ├── env-resolver.ts         # 環境変数解決
│   ├── schemas/
│   │   ├── selector.schema.ts  # セレクタスキーマ
│   │   └── commands/
│   │       └── click.schema.ts # Clickスキーマ（リファレンス実装）
│   └── validators/
│       ├── command-validator.ts    # コマンド検証
│       └── normalizers/
│           └── click.ts            # Click normalizer
├── executor/
│   ├── flow-executor.ts        # フロー実行
│   ├── execute-step.ts         # ステップ実行
│   └── commands/
│       ├── interaction.ts      # Click/Type/Fill等のハンドラ
│       └── cli-selector-utils.ts   # CLIセレクタ変換
└── types/
    └── commands.ts             # コマンド型定義

packages/agent-browser-adapter/src/
├── types.ts                    # Branded Types定義
├── executor.ts                 # CLI実行
├── validator.ts                # 戻り値検証
└── commands/
    └── interaction.ts          # browserClick等
```

---

## 11. 補足: JSON Schema生成

1段階検証では、valibotスキーマを**Single Source of Truth**として1つだけ定義する。
JSON Schema生成には `@valibot/to-json-schema` の以下のオプションを使用する:

- **`typeMode: "input"`**: transformより前の入力スキーマを使用
- **`ignoreActions: ['brand']`**: brandアクションを無視（入力検証に影響しないため）

```typescript
import * as v from 'valibot';
import { toJsonSchema } from '@valibot/to-json-schema';

// Runtime用スキーマ（brand/transform込み）を Single Source of Truth として定義
export const SelectorSpecSchema = v.union([
  v.object({ css: v.pipe(v.string(), v.minLength(1), v.regex(/^[a-zA-Z#.[:*]/), v.brand('CssSelector')) }),
  v.object({ ref: v.pipe(v.string(), v.regex(/^@[a-zA-Z0-9]+$/), v.brand('RefSelector')) }),
  v.object({ text: v.pipe(v.string(), v.minLength(1), v.brand('TextSelector')) }),
  v.object({ xpath: v.pipe(v.string(), v.minLength(1), v.regex(/^\//), v.brand('XpathSelector')) }),
]);

// JSON Schema生成設定
const jsonSchemaConfig = {
  typeMode: 'input' as const,  // transformより前の入力スキーマを使用
  ignoreActions: ['brand'],     // brandは入力検証に影響しないため無視
};

// JSON Schema生成
export const SelectorSpecJsonSchema = toJsonSchema(SelectorSpecSchema, jsonSchemaConfig);
```

**ポイント:**

- `typeMode: "input"` で `transform` より前の入力制約（minLength/regex等）のみを使用
- `ignoreActions: ['brand']` で `brand` アクションを無視（JSON Schemaには不要）
- Input版とRuntime版の2つのスキーマを別々に定義する必要はない
- スキーマの重複がなくなり、Single Source of Truthが維持される

**参考:** https://valibot.dev/blog/json-schema-package-upgrade/
