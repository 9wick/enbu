# core層 型厳密化計画

## 概要

naoya式関数型DDDの原則に基づき、core層の型厳密性を向上させる。

## 対象タスク

1. **StepResult/FlowResultの型厳密化** - 状態と属性の整合性を型レベルで保証
2. **isOk/isErr使用箇所の削減** - match/andThenへの統一
3. **コマンド型のBranded Type強化** - agent-browser-adapterの型を使用

---

## 1. StepResult/FlowResultの型厳密化

### 現状の問題

```typescript
// 現状: statusとerrorの整合性が保証されない
type StepResult = {
  status: 'passed' | 'failed';
  error?: { ... };  // passedでもerrorが存在できる
};
```

### 変更後

```typescript
// PassedStepResult: 成功時の型
type PassedStepResult = {
  index: number;
  command: Command;
  status: 'passed';
  duration: number;
  stdout?: string;
};

// FailedStepResult: 失敗時の型
type FailedStepResult = {
  index: number;
  command: Command;
  status: 'failed';
  duration: number;
  error: {
    message: string;
    type: ExecutionErrorType;
    screenshot?: string;
  };
};

type StepResult = PassedStepResult | FailedStepResult;
```

FlowResultも同様に分割:

```typescript
type PassedFlowResult = {
  flow: Flow;
  sessionName: string;
  status: 'passed';
  duration: number;
  steps: StepResult[];
};

type FailedFlowResult = {
  flow: Flow;
  sessionName: string;
  status: 'failed';
  duration: number;
  steps: StepResult[];
  error: {
    message: string;
    stepIndex: number;
    screenshot?: string;
  };
};

type FlowResult = PassedFlowResult | FailedFlowResult;
```

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/core/src/executor/result.ts` | 型定義の分割 |
| `packages/core/src/executor/flow-executor.ts` | 型ガード使用に変更、`!`演算子削除 |
| `packages/core/src/executor/execute-step.ts` | 型の使い分け |
| `apps/cli/src/commands/run.ts` | 型ガードによる分岐 |

---

## 2. isOk/isErr使用箇所の削減

### 変更対象箇所

| ファイル | 行 | 変更方法 |
|---------|-----|---------|
| `flow-executor.ts:236` | `expandResult.isErr()` → `andThen`チェーンに統合 |
| `auto-wait.ts:132` | `refsResult.isErr()` → `andThen`チェーンに統合 |
| `auto-wait.ts:146` | `pollResult.result.isOk()` → `match`に変更 |
| `execute-step.ts:152` | `waitResult.isErr()` → `match`または`andThen`に変更 |
| `env-expander.ts:50,101` | ループ → `reduce` + `andThen`パターンに変更 |
| `error-screenshot.ts:34` | `filePathResult.isErr()` → `match`に変更 |

### 変換パターン

#### パターンA: 同期Result → ResultAsyncへの変換

```typescript
// Before
if (expandResult.isErr()) {
  return errAsync(expandResult.error);
}
const expandedFlow = expandResult.value;
// ...続きの処理

// After
return ok(flow)
  .andThen(f => expandEnvVars(f, context.env))
  .asyncAndThen(expandedFlow => {
    // ...続きの処理
  });
```

#### パターンB: ループ内fail-fast

```typescript
// Before
for (const command of flow.steps) {
  const result = expandCommandEnvVars(command, env);
  if (result.isErr()) {
    return err(result.error);
  }
  expandedSteps.push(result.value);
}

// After
return flow.steps.reduce<Result<Command[], AgentBrowserError>>(
  (acc, command) => acc.andThen(steps =>
    expandCommandEnvVars(command, env).map(expanded => [...steps, expanded])
  ),
  ok([])
);
```

---

## 3. コマンド型のBranded Type強化

### 設計方針

- **変換場所**: Parser層（type-guards.ts, command-validator.ts）
- **検証責務**: Parserが持つ（Executorは検証済みの型を信頼）
- **型の出所**: agent-browser-adapterからimport（single source of truth）

### 対象フィールドのマッピング

| Command型 | フィールド | Branded Type |
|-----------|-----------|--------------|
| OpenCommand | url | `Url` |
| ClickCommand | selector | `Selector` |
| TypeCommand | selector | `Selector` |
| FillCommand | selector | `Selector` |
| HoverCommand | selector | `Selector` |
| SelectCommand | selector | `Selector` |
| ScrollIntoViewCommand | selector | `Selector` |
| AssertVisibleCommand | selector | `Selector` |
| AssertNotVisibleCommand | selector | `Selector` |
| AssertEnabledCommand | selector | `Selector` |
| AssertCheckedCommand | selector | `Selector` |
| WaitCommand | selector(条件付) | `Selector` |
| PressCommand | key | `KeyboardKey` |
| ScreenshotCommand | path | `FilePath` |
| EvalCommand | script | `JsExpression` |

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `packages/core/src/types/commands.ts` | Command型定義をBranded Typeに変更 |
| `packages/core/src/parser/validators/type-guards.ts` | normalizer関数でasSelector等を呼び出し |
| `packages/core/src/parser/validators/command-validator.ts` | Result型への変換対応 |
| `packages/core/package.json` | agent-browser-adapterへの依存追加（既にあるか確認） |

### 型定義の変更例

```typescript
// Before
import type { ... } from './commands';

export type ClickCommand = {
  command: 'click';
  selector: string;
};

// After
import type { Selector } from '@packages/agent-browser-adapter';

export type ClickCommand = {
  command: 'click';
  selector: Selector;
};
```

### normalizer関数の変更例

```typescript
// Before
export const normalizeClickCommand = (value: unknown): ClickCommand | null => {
  // ...
  if (obj.command === 'click' && typeof obj.selector === 'string') {
    return { command: 'click', selector: obj.selector };
  }
  // ...
};

// After
import { asSelector, type Selector } from '@packages/agent-browser-adapter';
import { type Result, ok, err } from 'neverthrow';

export const normalizeClickCommand = (
  value: unknown
): Result<ClickCommand, ParseError> => {
  // ...
  if (obj.command === 'click' && typeof obj.selector === 'string') {
    return asSelector(obj.selector)
      .map(selector => ({ command: 'click' as const, selector }))
      .mapErr(e => ({
        type: 'invalid_command' as const,
        message: e.message,
        commandIndex: -1, // 呼び出し元で設定
        commandContent: value,
      }));
  }
  // ...
};
```

### normalizers配列の変更

normalizerの戻り値が `Command | null` から `Result<Command, ParseError> | null` に変更される。
command-validator.tsでの処理も変更が必要。

---

## 実装順序

1. **StepResult/FlowResult型厳密化** (影響範囲が明確)
2. **isOk/isErr削減** (1の変更と同時に対応可能な箇所あり)
3. **Branded Type強化** (Parser層の大幅な変更)

---

## リスク・注意点

1. **破壊的変更**: Command型の変更はcoreパッケージを使用する全コードに影響
2. **テストの更新**: 型変更に伴いテストコードの修正が必要
3. **循環依存**: core → agent-browser-adapter の依存が増えるが、これは適切な方向

---

## 確認済み事項

- タグ名: `status` を維持（既存コードとの一貫性）
- isOk/isErr: 全箇所をmatch/andThenに置き換え
- Branded Type変換: Parser層で実施（検証責務の原則）
