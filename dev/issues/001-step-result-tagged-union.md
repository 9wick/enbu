# Issue: StepResultのstdout/screenshotをタグ付きユニオンに変更

## 概要

現在の`PassedStepResult`と`FailedStepResult`では、`stdout`と`screenshot`がoptionalプロパティになっている。
naoya式関数型DDDの思想に基づき、コマンドの種類によって出力の有無が決まるため、タグ付きユニオンで明示すべき。

## 現状

```typescript
// packages/core/src/executor/result.ts

type PassedStepResult = {
  index: number;
  command: Command;
  status: 'passed';
  duration: number;
  stdout?: string;  // 「あるかもしれない」- 曖昧
};

type FailedStepResult = {
  index: number;
  command: Command;
  status: 'failed';
  duration: number;
  error: {
    message: string;
    type: ExecutionErrorType;
    screenshot?: string;  // 「あるかもしれない」- 曖昧
  };
};
```

## 問題点

1. **stdout**: `eval`と`snapshot`コマンドのみ出力がある。他のコマンドでは必ず`undefined`
2. **screenshot**: エラー時にスクリーンショット撮影に成功した場合のみ存在

これらは「未知」ではなく「コマンド/状況によって決定される」ため、型で表現可能。

## 提案

### stdout のタグ付きユニオン化

```typescript
type PassedStepResultWithOutput = {
  index: number;
  command: EvalCommand | SnapshotCommand;
  status: 'passed';
  duration: number;
  hasOutput: true;
  stdout: string;
};

type PassedStepResultWithoutOutput = {
  index: number;
  command: Exclude<Command, EvalCommand | SnapshotCommand>;
  status: 'passed';
  duration: number;
  hasOutput: false;
};

type PassedStepResult = PassedStepResultWithOutput | PassedStepResultWithoutOutput;
```

### screenshot のタグ付きユニオン化

```typescript
type FailedStepResultWithScreenshot = {
  index: number;
  command: Command;
  status: 'failed';
  duration: number;
  error: {
    message: string;
    type: ExecutionErrorType;
    hasScreenshot: true;
    screenshot: string;
  };
};

type FailedStepResultWithoutScreenshot = {
  index: number;
  command: Command;
  status: 'failed';
  duration: number;
  error: {
    message: string;
    type: ExecutionErrorType;
    hasScreenshot: false;
  };
};

type FailedStepResult = FailedStepResultWithScreenshot | FailedStepResultWithoutScreenshot;
```

## 影響範囲

- `packages/core/src/executor/result.ts` - 型定義
- `packages/core/src/executor/execute-step.ts` - StepResult生成箇所
- `packages/core/src/executor/flow-executor.ts` - StepResult使用箇所
- `apps/cli/src/commands/run.ts` - StepResult参照箇所
- `apps/vscode-extension/` - StepResult参照箇所（間接的）
- テストファイル多数

## 検討事項

1. **command型との連動**: `PassedStepResultWithOutput`の`command`を`EvalCommand | SnapshotCommand`に制限することで、型レベルでの整合性を保証できるか？
2. **既存コードへの影響**: 使用箇所で`hasOutput`/`hasScreenshot`による分岐が必要になる
3. **FlowResultのscreenshot**: `FailedFlowResult.error.screenshot`も同様に対応が必要

## 関連

- ESLint警告: `result.ts:160`, `result.ts:182`, `result.ts:232`
- naoya式関数型DDD: タグ付きユニオンで状態を明示

## 優先度

中（ESLint警告として検出されているが、動作には影響なし）
