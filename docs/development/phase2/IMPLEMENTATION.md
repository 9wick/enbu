# Phase 2: 実装ガイド

このドキュメントは `@packages/core` の実装詳細を説明します。

---

## ファイル構成

```
packages/core/src/
├── index.ts                      # 公開APIのre-export
├── types/
│   ├── index.ts                  # 型定義の再エクスポート
│   ├── flow.ts                   # Flow, FlowEnv型定義
│   ├── commands.ts               # Command型定義（全コマンド）
│   └── errors.ts                 # ParseError型定義
├── parser/
│   ├── index.ts                  # パーサーの再エクスポート
│   ├── yaml-parser.ts            # parseFlowYaml実装
│   ├── env-resolver.ts           # resolveEnvVariables実装
│   └── validators/
│       ├── index.ts              # バリデーターの再エクスポート
│       ├── command-validator.ts  # コマンド検証ロジック
│       └── type-guards.ts        # 型ガード関数
└── loader/
    ├── index.ts                  # ローダーの再エクスポート
    └── flow-loader.ts            # loadFlows実装
```

---

## 1. types/flow.ts

Flowとその関連型を定義します。

```typescript
/**
 * フロー定義の型
 *
 * このファイルではフロー全体を表す型を定義する。
 */

/**
 * フロー内の環境変数定義
 */
export type FlowEnv = Readonly<Record<string, string>>;

/**
 * フロー定義
 */
export type Flow = {
  /** フロー名（ファイル名から取得） */
  name: string;
  /** フロー内で定義された環境変数 */
  env: FlowEnv;
  /** 実行するステップのシーケンス */
  steps: readonly Command[];
};
```

---

## 2. types/commands.ts

全てのコマンド型を定義します。

```typescript
/**
 * コマンド型定義
 *
 * 全てのコマンドを判別可能なユニオン型として定義する。
 * 各コマンドは共通の `command` フィールドで判別され、
 * コマンド固有のプロパティがフラットな構造で定義される。
 */

/**
 * ページを開く
 */
export type OpenCommand = {
  command: 'open';
  url: string;
};

/**
 * 要素をクリック
 */
export type ClickCommand = {
  command: 'click';
  selector: string;
  /** 同名要素が複数ある場合のインデックス指定（0始まり） */
  index?: number;
};

/**
 * テキストを入力（既存のテキストをクリアしない）
 */
export type TypeCommand = {
  command: 'type';
  selector: string;
  value: string;
  /** 入力前に既存のテキストをクリアするか */
  clear?: boolean;
};

/**
 * フォームにテキストを入力（既存のテキストをクリア）
 */
export type FillCommand = {
  command: 'fill';
  selector: string;
  value: string;
};

/**
 * キーボードキーを押す
 */
export type PressCommand = {
  command: 'press';
  key: string;
};

/**
 * 要素にホバー
 */
export type HoverCommand = {
  command: 'hover';
  selector: string;
};

/**
 * セレクトボックスから選択
 */
export type SelectCommand = {
  command: 'select';
  selector: string;
  value: string;
};

/**
 * ページをスクロール
 */
export type ScrollCommand = {
  command: 'scroll';
  direction: 'up' | 'down';
  amount: number;
};

/**
 * 要素をビューにスクロール
 */
export type ScrollIntoViewCommand = {
  command: 'scrollIntoView';
  selector: string;
};

/**
 * 待機
 */
export type WaitCommand = {
  command: 'wait';
} & (
  | { ms: number }
  | { target: string }
);

/**
 * スクリーンショットを保存
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: string;
  /** フルページスクリーンショットを撮影するか */
  fullPage?: boolean;
};

/**
 * ページの構造をスナップショット
 */
export type SnapshotCommand = {
  command: 'snapshot';
};

/**
 * JavaScriptを実行
 */
export type EvalCommand = {
  command: 'eval';
  script: string;
};

/**
 * 要素が表示されていることを確認
 */
export type AssertVisibleCommand = {
  command: 'assertVisible';
  selector: string;
};

/**
 * 要素が有効化されていることを確認
 */
export type AssertEnabledCommand = {
  command: 'assertEnabled';
  selector: string;
};

/**
 * チェックボックスがチェックされていることを確認
 */
export type AssertCheckedCommand = {
  command: 'assertChecked';
  selector: string;
};

/**
 * 全てのコマンド型のユニオン
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

---

## 3. types/errors.ts

パースエラー型を定義します。

```typescript
/**
 * パースエラー型定義
 */

/**
 * フローパース時のエラー型
 */
export type ParseError =
  | {
      type: 'yaml_syntax_error';
      message: string;
      line?: number;
      column?: number;
    }
  | {
      type: 'invalid_flow_structure';
      message: string;
      details?: string;
    }
  | {
      type: 'invalid_command';
      message: string;
      commandIndex: number;
      commandContent: unknown;
    }
  | {
      type: 'undefined_variable';
      message: string;
      variableName: string;
      location: string;
    }
  | {
      type: 'file_read_error';
      message: string;
      filePath: string;
      cause?: string;
    };
```

---

## 4. types/index.ts

型定義を再エクスポートします。

```typescript
/**
 * 型定義の再エクスポート
 */

export type { Flow, FlowEnv } from './flow';
export type {
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
} from './commands';
export type { ParseError } from './errors';
```

---

## 5. parser/yaml-parser.ts

YAMLパース処理を実装します。

### 実装方針

1. `yaml` パッケージを使用してYAMLをパース
2. `---` 区切りで複数ドキュメントに対応
3. 最初のドキュメントを `env` として解釈（オプション）
4. 最後のドキュメントをコマンド配列として解釈
5. 各コマンドをバリデーションして型変換

### YAMLからTypeScript型への変換ルール

YAML形式からTypeScript型への変換時に、以下の変換を行います:

**基本ルール:**
- YAMLのキー名を `command` フィールドに設定
- YAMLの値をフラットな構造に展開

**プロパティ名の変換:**
- `text` → `value` (TypeCommand, FillCommand)
- `selector` → `target` (WaitCommand で要素待機の場合)

**例:**
```yaml
# YAML
- open: https://example.com
- type:
    selector: "検索"
    text: "キーワード"
- wait: "読み込み完了"
```

```typescript
// TypeScript
{ command: 'open', url: 'https://example.com' }
{ command: 'type', selector: '検索', value: 'キーワード' }
{ command: 'wait', target: '読み込み完了' }
```

### コード構造

```typescript
import { Result, ok, err, fromThrowable } from 'neverthrow';
import * as yaml from 'yaml';
import type { Flow, FlowEnv, Command, ParseError } from '../types';
import { validateCommand } from './validators/command-validator';

/**
 * YAMLパースをResult型でラップ
 *
 * fromThrowableのスコープは最小限（yaml.parseのみ）
 */
const safeYamlParse = fromThrowable(
  (text: string) => yaml.parseAllDocuments(text),
  (error): ParseError => {
    if (error instanceof yaml.YAMLParseError) {
      return {
        type: 'yaml_syntax_error',
        message: error.message,
        line: error.linePos?.[0].line,
        column: error.linePos?.[0].col,
      };
    }
    return {
      type: 'yaml_syntax_error',
      message: error instanceof Error ? error.message : 'Unknown YAML parse error',
    };
  }
);

/**
 * YAMLファイルをパースしてFlowオブジェクトに変換する
 */
export const parseFlowYaml = (
  yamlContent: string,
  fileName: string
): Result<Flow, ParseError> => {
  // 1. YAMLをパース
  const parseResult = safeYamlParse(yamlContent);

  return parseResult.andThen((documents) => {
    // 2. ドキュメント数の確認
    if (documents.length === 0) {
      return err({
        type: 'invalid_flow_structure',
        message: 'YAML contains no documents',
        details: 'Expected at least one document with command array',
      });
    }

    // 3. envセクションとコマンド配列を抽出
    const { env, commands } = extractEnvAndCommands(documents);

    // 4. コマンド配列の検証
    const validateResult = validateCommands(commands);
    if (validateResult.isErr()) {
      return validateResult;
    }

    // 5. フロー名をファイル名から生成（拡張子を除去）
    const name = fileName.replace(/\.enbu\.yaml$/, '');

    return ok({
      name,
      env,
      steps: validateResult.value,
    });
  });
};

/**
 * YAMLドキュメントからenvとコマンド配列を抽出する
 *
 * 純粋関数として実装。
 */
const extractEnvAndCommands = (
  documents: yaml.Document.Parsed[]
): { env: FlowEnv; commands: unknown[] } => {
  // ドキュメントが1つの場合: コマンド配列のみ
  if (documents.length === 1) {
    const commandsDoc = documents[0].toJSON();
    return {
      env: {},
      commands: Array.isArray(commandsDoc) ? commandsDoc : [],
    };
  }

  // ドキュメントが2つ以上の場合: 最初がenv、最後がコマンド配列
  const envDoc = documents[0].toJSON();
  const commandsDoc = documents[documents.length - 1].toJSON();

  const env: FlowEnv = {};
  if (envDoc && typeof envDoc === 'object' && 'env' in envDoc) {
    const envSection = (envDoc as { env: unknown }).env;
    if (envSection && typeof envSection === 'object') {
      // 全ての値を文字列に変換
      for (const [key, value] of Object.entries(envSection)) {
        if (typeof value === 'string') {
          env[key] = value;
        } else {
          env[key] = String(value);
        }
      }
    }
  }

  return {
    env,
    commands: Array.isArray(commandsDoc) ? commandsDoc : [],
  };
};

/**
 * コマンド配列を検証する
 *
 * 各コマンドをバリデーションし、型安全なCommand配列に変換。
 */
const validateCommands = (
  commands: unknown[]
): Result<readonly Command[], ParseError> => {
  if (commands.length === 0) {
    return err({
      type: 'invalid_flow_structure',
      message: 'Flow contains no commands',
      details: 'Expected at least one command in the command array',
    });
  }

  const validatedCommands: Command[] = [];

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const validationResult = validateCommand(command, i);

    if (validationResult.isErr()) {
      return validationResult;
    }

    validatedCommands.push(validationResult.value);
  }

  return ok(validatedCommands);
};
```

---

## 6. parser/validators/command-validator.ts

コマンド検証ロジックを実装します。

### 実装方針

1. 各コマンドのキー（`open`, `click` など）を判定
2. キーごとに適切な型ガードを適用
3. バリデーション失敗時は詳細なエラーメッセージ

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import type { Command, ParseError } from '../../types';
import {
  isOpenCommand,
  isClickCommand,
  isTypeCommand,
  isFillCommand,
  isPressCommand,
  isHoverCommand,
  isSelectCommand,
  isScrollCommand,
  isScrollIntoViewCommand,
  isWaitCommand,
  isScreenshotCommand,
  isSnapshotCommand,
  isEvalCommand,
  isAssertVisibleCommand,
  isAssertEnabledCommand,
  isAssertCheckedCommand,
} from './type-guards';

/**
 * コマンドを検証してCommand型に変換する
 */
export const validateCommand = (
  command: unknown,
  commandIndex: number
): Result<Command, ParseError> => {
  // コマンドがオブジェクトかチェック
  if (typeof command !== 'object' || command === null) {
    return err({
      type: 'invalid_command',
      message: 'Command must be an object',
      commandIndex,
      commandContent: command,
    });
  }

  // 各コマンド型を型ガードで判定
  if (isOpenCommand(command)) return ok(command);
  if (isClickCommand(command)) return ok(command);
  if (isTypeCommand(command)) return ok(command);
  if (isFillCommand(command)) return ok(command);
  if (isPressCommand(command)) return ok(command);
  if (isHoverCommand(command)) return ok(command);
  if (isSelectCommand(command)) return ok(command);
  if (isScrollCommand(command)) return ok(command);
  if (isScrollIntoViewCommand(command)) return ok(command);
  if (isWaitCommand(command)) return ok(command);
  if (isScreenshotCommand(command)) return ok(command);
  if (isSnapshotCommand(command)) return ok(command);
  if (isEvalCommand(command)) return ok(command);
  if (isAssertVisibleCommand(command)) return ok(command);
  if (isAssertEnabledCommand(command)) return ok(command);
  if (isAssertCheckedCommand(command)) return ok(command);

  // どの型にもマッチしない
  return err({
    type: 'invalid_command',
    message: 'Unknown or invalid command format',
    commandIndex,
    commandContent: command,
  });
};
```

---

## 7. parser/validators/type-guards.ts

型ガード関数を実装します。

### 実装方針

1. 各コマンド型ごとに型ガード関数を作成
2. 必須フィールドの存在と型を確認
3. 純粋関数として実装

### コード構造（一部抜粋）

```typescript
import type {
  OpenCommand,
  ClickCommand,
  TypeCommand,
  FillCommand,
  // ... 他のコマンド型
} from '../../types';

/**
 * OpenCommandの型ガード
 */
export const isOpenCommand = (value: unknown): value is OpenCommand => {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  // commandフィールドがopenか確認
  if (obj.command !== 'open') return false;

  // urlフィールドが文字列か確認
  return typeof obj.url === 'string';
};

/**
 * ClickCommandの型ガード
 */
export const isClickCommand = (value: unknown): value is ClickCommand => {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  // commandフィールドがclickか確認
  if (obj.command !== 'click') return false;

  // selectorフィールドが文字列か確認
  if (typeof obj.selector !== 'string') return false;

  // indexは省略可能だが、存在する場合は数値
  if (obj.index !== undefined && typeof obj.index !== 'number') return false;

  return true;
};

/**
 * TypeCommandの型ガード
 */
export const isTypeCommand = (value: unknown): value is TypeCommand => {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  // commandフィールドがtypeか確認
  if (obj.command !== 'type') return false;

  // selector, valueフィールドが文字列か確認
  if (typeof obj.selector !== 'string') return false;
  if (typeof obj.value !== 'string') return false;

  // clearは省略可能だが、存在する場合はboolean
  if (obj.clear !== undefined && typeof obj.clear !== 'boolean') return false;

  return true;
};

// ... 他のコマンド型ガード（同様のパターン）
```

**型ガードの共通パターン**:

1. `null` と非オブジェクトをチェック
2. `command` フィールドの値を確認
3. 必須フィールドの型を確認
4. オプションフィールドが存在する場合は型を確認

---

## 8. parser/env-resolver.ts

環境変数解決処理を実装します。

### 実装方針

1. 環境変数マップを優先順位順に統合
2. 全てのコマンドのプロパティを走査
3. `${VAR}` パターンを検出して置換
4. 未定義変数はエラーとして扱う

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import type { Flow, Command, ParseError } from '../types';

/**
 * フロー内の環境変数参照を解決する
 */
export const resolveEnvVariables = (
  flow: Flow,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>
): Result<Flow, ParseError> => {
  // 1. 環境変数マップを統合（優先順位: processEnv > dotEnv > flow.env）
  const envMap = mergeEnvMaps(processEnv, dotEnv, flow.env);

  // 2. 全てのコマンドを走査して環境変数を解決
  const resolvedCommands: Command[] = [];

  for (const command of flow.steps) {
    const resolveResult = resolveCommandVariables(command, envMap);

    if (resolveResult.isErr()) {
      return resolveResult;
    }

    resolvedCommands.push(resolveResult.value);
  }

  // 3. 解決済みフローを返す
  return ok({
    ...flow,
    steps: resolvedCommands,
  });
};

/**
 * 環境変数マップを統合する
 *
 * 優先順位: processEnv > dotEnv > flowEnv
 */
const mergeEnvMaps = (
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
  flowEnv: Readonly<Record<string, string>>
): Record<string, string> => {
  const merged: Record<string, string> = {};

  // 優先順位の低い順に追加
  Object.assign(merged, flowEnv);
  Object.assign(merged, dotEnv);

  // processEnvは未定義の値を除外
  for (const [key, value] of Object.entries(processEnv)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
};

/**
 * コマンド内の環境変数を解決する
 */
const resolveCommandVariables = (
  command: Command,
  envMap: Record<string, string>
): Result<Command, ParseError> => {
  // コマンドを深くクローン
  const cloned = structuredClone(command);

  // 全てのプロパティを走査して文字列を解決
  const resolveResult = resolveObjectVariables(cloned, envMap, getCommandName(command));

  return resolveResult.map(() => cloned);
};

/**
 * オブジェクトの全てのプロパティを走査して環境変数を解決する
 *
 * 再帰的に処理（ネストされたオブジェクトに対応）
 */
const resolveObjectVariables = (
  obj: Record<string, unknown>,
  envMap: Record<string, string>,
  location: string
): Result<void, ParseError> => {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // 文字列プロパティの環境変数を解決
      const resolveResult = resolveStringVariables(value, envMap, `${location}.${key}`);
      if (resolveResult.isErr()) {
        return resolveResult;
      }
      obj[key] = resolveResult.value;
    } else if (typeof value === 'object' && value !== null) {
      // ネストされたオブジェクトを再帰的に処理
      const nestedResult = resolveObjectVariables(
        value as Record<string, unknown>,
        envMap,
        `${location}.${key}`
      );
      if (nestedResult.isErr()) {
        return nestedResult;
      }
    }
  }

  return ok(undefined);
};

/**
 * 文字列内の環境変数参照を解決する
 *
 * ${VAR} 形式の全ての参照を置換。
 */
const resolveStringVariables = (
  text: string,
  envMap: Record<string, string>,
  location: string
): Result<string, ParseError> => {
  // ${VAR} パターンを検出
  const variablePattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

  let resolved = text;
  const matches = [...text.matchAll(variablePattern)];

  for (const match of matches) {
    const fullMatch = match[0]; // ${VAR}
    const varName = match[1]; // VAR

    // 環境変数マップから値を取得
    const value = envMap[varName];

    if (value === undefined) {
      return err({
        type: 'undefined_variable',
        message: `Variable "${varName}" is not defined`,
        variableName: varName,
        location,
      });
    }

    // 置換
    resolved = resolved.replace(fullMatch, value);
  }

  return ok(resolved);
};

/**
 * コマンド名を取得する
 *
 * エラーメッセージ用。
 */
const getCommandName = (command: Command): string => {
  const keys = Object.keys(command);
  return keys[0] ?? 'unknown';
};
```

---

## 9. loader/flow-loader.ts

フローローダーを実装します。

### 実装方針

1. dotenvで.envファイルを読み込み
2. ディレクトリから`*.enbu.yaml`ファイルを検索
3. 各ファイルをパースして環境変数を解決
4. エラーが発生した場合は最初のエラーを返す

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import dotenv from 'dotenv';
import type { Flow, ParseError } from '../types';
import { parseFlowYaml } from '../parser/yaml-parser';
import { resolveEnvVariables } from '../parser/env-resolver';

/**
 * ディレクトリから全てのフローファイルを読み込む
 */
export const loadFlows = async (
  dirPath: string,
  options?: {
    processEnv?: Readonly<Record<string, string | undefined>>;
    dotEnvPath?: string;
  }
): Promise<Result<readonly Flow[], ParseError>> => {
  const processEnv = options?.processEnv ?? process.env;
  const dotEnvPath = options?.dotEnvPath ?? '.env';

  // 1. .envファイルを読み込み
  const dotEnv = dotenv.config({ path: dotEnvPath }).parsed ?? {};

  // 2. ディレクトリから*.enbu.yamlファイルを検索
  const findResult = await findFlowFiles(dirPath);
  if (findResult.isErr()) {
    return findResult;
  }

  const flowFiles = findResult.value;

  // 3. 各ファイルをパースして環境変数を解決
  const flows: Flow[] = [];

  for (const filePath of flowFiles) {
    const loadResult = await loadSingleFlow(filePath, processEnv, dotEnv);

    if (loadResult.isErr()) {
      return loadResult;
    }

    flows.push(loadResult.value);
  }

  return ok(flows);
};

/**
 * ディレクトリから*.enbu.yamlファイルを検索する
 */
const findFlowFiles = async (
  dirPath: string
): Promise<Result<readonly string[], ParseError>> => {
  try {
    // ディレクトリ内のファイルを取得
    const entries = await readdir(dirPath, { withFileTypes: true });

    // *.enbu.yamlにマッチするファイルをフィルター
    const flowFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.enbu.yaml'))
      .map((entry) => join(dirPath, entry.name))
      .sort(); // ファイル名順にソート

    return ok(flowFiles);
  } catch (error) {
    return err({
      type: 'file_read_error',
      message: `Failed to read directory: ${dirPath}`,
      filePath: dirPath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * 単一のフローファイルを読み込んでパースする
 */
const loadSingleFlow = async (
  filePath: string,
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>
): Promise<Result<Flow, ParseError>> => {
  // 1. ファイル読み込み
  let yamlContent: string;
  try {
    yamlContent = await readFile(filePath, 'utf-8');
  } catch (error) {
    return err({
      type: 'file_read_error',
      message: `Failed to read file: ${filePath}`,
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. ファイル名を抽出
  const fileName = filePath.split('/').pop() ?? 'unknown.enbu.yaml';

  // 3. YAMLをパース
  const parseResult = parseFlowYaml(yamlContent, fileName);
  if (parseResult.isErr()) {
    return parseResult;
  }

  // 4. 環境変数を解決
  return resolveEnvVariables(parseResult.value, processEnv, dotEnv);
};
```

---

## 10. index.ts

公開APIをre-exportします。

```typescript
/**
 * @packages/core
 *
 * フロー定義の型システム、パーサー、ローダーを提供する。
 */

// 型
export type {
  Flow,
  FlowEnv,
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
  ParseError,
} from './types';

// 関数
export { parseFlowYaml, resolveEnvVariables } from './parser';
export { loadFlows } from './loader';
```

---

## コーディング規約（CLAUDE.md準拠）

### neverthrow の使い方

```typescript
// 正しい: match, map, andThen でチェーン
result
  .andThen(parseFlowYaml)
  .andThen((flow) => resolveEnvVariables(flow, process.env, {}))
  .match(
    (flow) => console.log(flow),
    (error) => console.error(error)
  );

// 間違い: isOk, isErr で分岐
if (result.isOk()) {
  // ...
}
```

### fromThrowable のスコープ最小化

```typescript
// 正しい: 外部ライブラリのみをラップ
const safeYamlParse = fromThrowable(
  (text: string) => yaml.parseAllDocuments(text),
  (error): ParseError => ({ ... })
);

// 間違い: 複数の処理を含む
const badExample = fromThrowable(
  (text: string) => {
    const parsed = yaml.parseAllDocuments(text);
    // 他の処理を含めてはいけない
    return validateStructure(parsed);
  },
  ...
);
```

### 純粋関数と副作用の分離

```typescript
// 正しい: 純粋関数
const mergeEnvMaps = (
  processEnv: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string>>,
  flowEnv: Readonly<Record<string, string>>
): Record<string, string> => {
  const merged: Record<string, string> = {};
  Object.assign(merged, flowEnv);
  Object.assign(merged, dotEnv);
  // ...
  return merged;
};

// 間違い: 副作用を含む
const badMerge = (...envs) => {
  console.log('Merging...'); // 副作用（ログ出力）
  return merge(envs);
};
```

### エラーハンドリング

```typescript
// 正しい: 早期エラー検出
const validateCommands = (commands: unknown[]): Result<readonly Command[], ParseError> => {
  if (commands.length === 0) {
    return err({
      type: 'invalid_flow_structure',
      message: 'Flow contains no commands',
    });
  }
  // ...
};

// 使用例
validateCommands(commands)
  .andThen((cmds) => processCommands(cmds));
```

### TSDoc（日本語で記述）

```typescript
/**
 * YAMLファイルをパースしてFlowオブジェクトに変換する
 *
 * @param yamlContent - YAMLファイルの内容
 * @param fileName - ファイル名（フロー名として使用）
 * @returns 成功時: Flowオブジェクト、失敗時: ParseError
 *
 * @remarks
 * - YAMLは `---` 区切りで複数ドキュメントに対応
 * - 最初のドキュメントは env セクション（オプション）
 * - 最後のドキュメントはコマンド配列
 * - コマンドは型検証され、不正な形式はエラーとなる
 */
export const parseFlowYaml = (
  yamlContent: string,
  fileName: string
): Result<Flow, ParseError> => {
  // ...
};
```

### テストデータの命名

```typescript
// 正しい: 意味が明確な日本語
const testFlow: Flow = {
  name: 'ログインフロー',
  env: { BASE_URL: 'https://example.com' },
  steps: [
    { command: 'open', url: 'https://example.com/login' },
    { command: 'click', selector: 'ログインボタン' },
  ],
};

// 間違い: 意味不明な文字列
const badTestFlow: Flow = {
  name: 'flow1',
  env: { VAR: 'value' },
  steps: [
    { command: 'open', url: 'url1' },
    { command: 'click', selector: 'elem' },
  ],
};
```
