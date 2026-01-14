# Phase 3: 実装ガイド

このドキュメントは `@packages/core/executor` の実装詳細を説明します。

---

## ファイル構成

```
packages/core/src/executor/
├── index.ts                    # 公開APIのre-export
├── result.ts                   # 型定義（FlowResult, StepResult, FlowExecutionOptions）
├── flow-executor.ts            # executeFlow関数の実装
├── auto-wait.ts                # 自動待機ロジック
└── commands/
    ├── index.ts                # コマンドハンドラのエクスポート
    ├── navigation.ts           # open
    ├── interaction.ts          # click, type, fill, press
    ├── hover-select.ts         # hover, select
    ├── scroll.ts               # scroll, scrollintoview
    ├── wait.ts                 # wait
    ├── capture.ts              # screenshot, snapshot
    ├── eval.ts                 # eval
    └── assertions.ts           # assertVisible, assertEnabled, assertChecked
```

---

## 1. result.ts

型定義を一箇所にまとめます。

```typescript
/**
 * executor の型定義
 */

import type { Flow, Command } from '../types'; // Phase 2の型をインポート
import type { AgentBrowserError } from '@packages/agent-browser-adapter';

/**
 * 実行エラーの種別
 */
export type ExecutionErrorType =
  | 'not_installed'      // agent-browserがインストールされていない
  | 'command_failed'     // コマンド実行が失敗
  | 'timeout'            // タイムアウト
  | 'parse_error'        // レスポンスのパースに失敗
  | 'assertion_failed'   // アサーションが失敗
  | 'validation_error';  // バリデーションエラー

/**
 * フロー実行時のオプション
 */
export type FlowExecutionOptions = {
  sessionName: string;
  headed?: boolean;
  env?: Record<string, string>;
  autoWaitTimeoutMs?: number;
  autoWaitIntervalMs?: number;
  commandTimeoutMs?: number;
  cwd?: string;
  screenshot?: boolean;
  bail?: boolean;
};

/**
 * 各ステップの実行結果
 */
export type StepResult = {
  index: number;
  command: Command;
  status: 'passed' | 'failed';
  duration: number;
  stdout?: string;
  error?: {
    message: string;
    type: ExecutionErrorType;
    screenshot?: string;
  };
};

/**
 * フロー全体の実行結果
 */
export type FlowResult = {
  flow: Flow;
  status: 'passed' | 'failed';
  duration: number;
  steps: StepResult[];
  error?: {
    message: string;
    stepIndex: number;
    screenshot?: string;
  };
};

/**
 * コマンド実行のコンテキスト（内部使用）
 */
export type ExecutionContext = {
  sessionName: string;
  executeOptions: {
    sessionName: string;
    headed: boolean;
    timeoutMs: number;
    cwd?: string;
  };
  env: Record<string, string>;
  autoWaitTimeoutMs: number;
  autoWaitIntervalMs: number;
};

/**
 * コマンド実行結果（内部使用）
 */
export type CommandResult = {
  stdout: string;
  duration: number;
};
```

---

## 2. flow-executor.ts

フロー実行のメインロジック。

### 実装方針

1. オプションのデフォルト値を設定
2. 環境変数を展開
3. 各ステップを順次実行
4. エラー発生時の処理:
   - `bail: true`（デフォルト）: 即座に停止
   - `bail: false`: 失敗ステップをスキップして続行
5. 失敗時にスクリーンショットを撮影（`screenshot: true` の場合のみ）

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import type { Flow } from '../types';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type {
  FlowResult,
  FlowExecutionOptions,
  StepResult,
  ExecutionContext,
} from './result';
import { executeStep } from './execute-step';
import { expandEnvVars } from './env-expander';
import { captureErrorScreenshot } from './error-screenshot';

/**
 * フローを実行する
 */
export const executeFlow = async (
  flow: Flow,
  options: FlowExecutionOptions
): Promise<Result<FlowResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // デフォルト値の設定
  const bail = options.bail ?? true; // デフォルトはtrue（最初の失敗で中断）
  const screenshot = options.screenshot ?? true; // デフォルトはtrue（スクリーンショット撮影）

  const context: ExecutionContext = {
    sessionName: options.sessionName,
    executeOptions: {
      sessionName: options.sessionName,
      headed: options.headed ?? false,
      timeoutMs: options.commandTimeoutMs ?? 30000,
      cwd: options.cwd,
    },
    env: options.env ?? {},
    autoWaitTimeoutMs: options.autoWaitTimeoutMs ?? 30000,
    autoWaitIntervalMs: options.autoWaitIntervalMs ?? 100,
  };

  // 環境変数を展開
  const expandedFlow = expandEnvVars(flow, context.env);

  // 各ステップを実行
  const steps: StepResult[] = [];
  let hasFailure = false;
  let firstFailureIndex = -1;

  for (let i = 0; i < expandedFlow.steps.length; i++) {
    const command = expandedFlow.steps[i];

    // ステップ実行
    const stepResult = await executeStep(command, i, context, screenshot);

    steps.push(stepResult);

    // 失敗時の処理
    if (stepResult.status === 'failed') {
      if (!hasFailure) {
        hasFailure = true;
        firstFailureIndex = i;
      }

      // bail: true の場合は即座に停止
      if (bail) {
        const duration = Date.now() - startTime;

        return ok({
          flow: expandedFlow,
          status: 'failed',
          duration,
          steps,
          error: {
            message: stepResult.error!.message,
            stepIndex: i,
            screenshot: stepResult.error!.screenshot,
          },
        });
      }
      // bail: false の場合は続行（次のステップへ）
    }
  }

  // 全ステップ実行後の判定
  const duration = Date.now() - startTime;

  if (hasFailure) {
    // 失敗があった場合
    const firstFailureStep = steps[firstFailureIndex];
    return ok({
      flow: expandedFlow,
      status: 'failed',
      duration,
      steps,
      error: {
        message: firstFailureStep.error!.message,
        stepIndex: firstFailureIndex,
        screenshot: firstFailureStep.error!.screenshot,
      },
    });
  }

  // 全ステップ成功
  return ok({
    flow: expandedFlow,
    status: 'passed',
    duration,
    steps,
  });
};
```

---

## 3. execute-step.ts

各ステップの実行ロジック（内部モジュール）。

### 実装方針

1. コマンドの種類に応じてハンドラを選択
2. 自動待機が必要なコマンドの場合は待機を実行
3. コマンドハンドラを実行
4. 実行時間を計測
5. エラー時にスクリーンショットを撮影（screenshotフラグがtrueの場合のみ）

### コード構造

```typescript
import { Result } from 'neverthrow';
import type { Command } from '../types';
import type { StepResult, ExecutionContext } from './result';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import { autoWait } from './auto-wait';
import { getCommandHandler } from './commands';
import { captureErrorScreenshot } from './error-screenshot';

/**
 * 単一のステップを実行する
 */
export const executeStep = async (
  command: Command,
  index: number,
  context: ExecutionContext,
  captureScreenshot: boolean
): Promise<StepResult> => {
  const startTime = Date.now();

  try {
    // 自動待機が必要なコマンドの場合
    if (shouldAutoWait(command)) {
      const waitResult = await autoWait(
        getSelectorFromCommand(command),
        context
      );

      // 自動待機失敗
      if (waitResult.isErr()) {
        const duration = Date.now() - startTime;
        const screenshot = captureScreenshot
          ? await captureErrorScreenshot(context)
          : undefined;

        return {
          index,
          command,
          status: 'failed',
          duration,
          error: {
            message: `Auto-wait timeout: ${waitResult.error.message}`,
            type: waitResult.error.type,
            screenshot,
          },
        };
      }
    }

    // コマンドハンドラを取得
    const handler = getCommandHandler(command.command);

    // コマンド実行
    const result = await handler(command, context);

    const duration = Date.now() - startTime;

    // 結果の処理
    return result.match(
      (commandResult) => ({
        index,
        command,
        status: 'passed' as const,
        duration,
        stdout: commandResult.stdout,
      }),
      async (error) => {
        // エラー時のスクリーンショット
        const screenshot = captureScreenshot
          ? await captureErrorScreenshot(context)
          : undefined;

        return {
          index,
          command,
          status: 'failed' as const,
          duration,
          error: {
            message: error.message ?? 'Command execution failed',
            type: error.type,
            screenshot,
          },
        };
      }
    );
  } catch (error) {
    // 予期しないエラー（バグの可能性）
    const duration = Date.now() - startTime;
    const screenshot = captureScreenshot
      ? await captureErrorScreenshot(context)
      : undefined;

    return {
      index,
      command,
      status: 'failed',
      duration,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'validation_error',
        screenshot,
      },
    };
  }
};

/**
 * 自動待機が必要なコマンドかどうか
 */
const shouldAutoWait = (command: Command): boolean => {
  const autoWaitCommands = [
    'click',
    'type',
    'fill',
    'hover',
    'select',
    'scrollintoview',
    'assertVisible',
    'assertEnabled',
    'assertChecked',
  ];

  return autoWaitCommands.includes(command.command);
};

/**
 * コマンドからセレクタを取得
 */
const getSelectorFromCommand = (command: Command): string | undefined => {
  if ('selector' in command) {
    return command.selector;
  }
  if ('target' in command && typeof command.target === 'string') {
    return command.target;
  }
  return undefined;
};
```

---

## 4. auto-wait.ts

自動待機ロジックの実装。

### 実装方針

1. `snapshot --json -i` でインタラクティブ要素を取得
2. セレクタに一致する要素を探す
3. 見つからない場合はポーリング
4. タイムアウトまで繰り返す

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import { executeCommand, parseJsonOutput, parseSnapshotRefs } from '@packages/agent-browser-adapter';
import type { AgentBrowserError, SnapshotRefs } from '@packages/agent-browser-adapter';
import type { ExecutionContext } from './result';

/**
 * 要素の出現を待機する
 *
 * @param selector - 待機する要素のセレクタ
 * @param context - 実行コンテキスト
 * @returns 成功時: 要素が見つかった旨のメッセージ、失敗時: AgentBrowserError
 */
export const autoWait = async (
  selector: string | undefined,
  context: ExecutionContext
): Promise<Result<string, AgentBrowserError>> => {
  // セレクタがない場合はスキップ
  if (!selector) {
    return ok('No selector to wait for');
  }

  const startTime = Date.now();
  const { autoWaitTimeoutMs, autoWaitIntervalMs, executeOptions } = context;

  // ポーリングループ
  while (true) {
    // snapshot取得
    const snapshotResult = await executeCommand(
      'snapshot',
      ['--json', '-i'],
      executeOptions
    )
      .andThen(parseJsonOutput)
      .andThen(parseSnapshotRefs);

    // snapshotのパース失敗は致命的エラー
    if (snapshotResult.isErr()) {
      return err(snapshotResult.error);
    }

    const refs = snapshotResult.value;

    // セレクタに一致する要素を検索
    if (isElementFound(selector, refs)) {
      return ok(`Element "${selector}" found`);
    }

    // タイムアウトチェック
    const elapsed = Date.now() - startTime;
    if (elapsed >= autoWaitTimeoutMs) {
      return err({
        type: 'timeout',
        command: 'auto-wait',
        args: [selector],
        timeoutMs: autoWaitTimeoutMs,
      });
    }

    // 次のポーリングまで待機
    await sleep(autoWaitIntervalMs);
  }
};

/**
 * セレクタに一致する要素が見つかったか判定
 */
const isElementFound = (selector: string, refs: SnapshotRefs): boolean => {
  // @e1 形式の参照IDの場合
  if (selector.startsWith('@')) {
    const refId = selector.slice(1);
    return refId in refs;
  }

  // テキストまたはロールでマッチング
  return Object.values(refs).some(
    (ref) =>
      ref.name.includes(selector) ||
      ref.role === selector ||
      ref.name === selector
  );
};

/**
 * 指定ミリ秒待機
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
```

---

## 5. env-expander.ts

環境変数の展開ロジック（内部モジュール）。

### 実装方針

1. フロー全体を走査
2. 文字列フィールドで `${VAR_NAME}` を検出
3. `env[VAR_NAME]` に置換
4. 存在しない変数は空文字列に置換

### コード構造

```typescript
import type { Flow, Command } from '../types';

/**
 * フロー内の環境変数を展開する
 */
export const expandEnvVars = (flow: Flow, env: Record<string, string>): Flow => {
  return {
    ...flow,
    steps: flow.steps.map((command) => expandCommandEnvVars(command, env)),
  };
};

/**
 * コマンド内の環境変数を展開する
 */
const expandCommandEnvVars = (command: Command, env: Record<string, string>): Command => {
  const expanded: Record<string, unknown> = { ...command };

  for (const [key, value] of Object.entries(expanded)) {
    if (typeof value === 'string') {
      expanded[key] = expandString(value, env);
    }
  }

  return expanded as Command;
};

/**
 * 文字列内の環境変数を展開する
 *
 * ${VAR_NAME} を env[VAR_NAME] に置換
 * 存在しない変数は空文字列
 */
const expandString = (str: string, env: Record<string, string>): string => {
  return str.replace(/\$\{([^}]+)\}/g, (_, varName) => env[varName] ?? '');
};
```

---

## 6. error-screenshot.ts

エラー時のスクリーンショット撮影（内部モジュール）。

### 実装方針

1. `/tmp/flow-error-{timestamp}.png` にスクリーンショットを保存
2. エラー時に自動的に呼び出される
3. 撮影失敗時は `undefined` を返す（エラーをネストさせない）

### コード構造

```typescript
import { executeCommand } from '@packages/agent-browser-adapter';
import type { ExecutionContext } from './result';

/**
 * エラー時のスクリーンショットを撮影する
 *
 * @returns スクリーンショットのパス、失敗時は undefined
 */
export const captureErrorScreenshot = async (
  context: ExecutionContext
): Promise<string | undefined> => {
  const timestamp = Date.now();
  const path = `/tmp/flow-error-${timestamp}.png`;

  const result = await executeCommand(
    'screenshot',
    [path, '--json'],
    context.executeOptions
  );

  // 撮影失敗時は undefined を返す
  return result.match(
    () => path,
    () => undefined
  );
};
```

---

## 7. commands/index.ts

コマンドハンドラのルーティング。

### 実装方針

1. コマンド名から対応するハンドラを返す
2. 未実装のコマンドはエラーを返す

### コード構造

```typescript
import type { Command } from '../../types';
import type { CommandHandler } from '../result';
import { handleOpen } from './navigation';
import { handleClick, handleType, handleFill, handlePress } from './interaction';
import { handleHover, handleSelect } from './hover-select';
import { handleScroll, handleScrollIntoView } from './scroll';
import { handleWait } from './wait';
import { handleScreenshot, handleSnapshot } from './capture';
import { handleEval } from './eval';
import { handleAssertVisible, handleAssertEnabled, handleAssertChecked } from './assertions';

/**
 * コマンド名に対応するハンドラを取得する
 */
export const getCommandHandler = (commandName: string): CommandHandler<Command> => {
  const handlers: Record<string, CommandHandler<Command>> = {
    open: handleOpen,
    click: handleClick,
    type: handleType,
    fill: handleFill,
    press: handlePress,
    hover: handleHover,
    select: handleSelect,
    scroll: handleScroll,
    scrollintoview: handleScrollIntoView,
    wait: handleWait,
    screenshot: handleScreenshot,
    snapshot: handleSnapshot,
    eval: handleEval,
    assertVisible: handleAssertVisible,
    assertEnabled: handleAssertEnabled,
    assertChecked: handleAssertChecked,
  };

  const handler = handlers[commandName];

  if (!handler) {
    // 未実装のコマンドは開発時のバグ
    throw new Error(`Unknown command: ${commandName}`);
  }

  return handler;
};
```

---

## 8. コマンドハンドラの実装

各コマンドハンドラは以下のパターンに従います。

### 8.1. navigation.ts (open)

```typescript
import { Result, ok } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { OpenCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * open コマンドのハンドラ
 */
export const handleOpen = async (
  command: OpenCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  const result = await executeCommand(
    'open',
    [command.url, '--json'],
    context.executeOptions
  ).andThen(parseJsonOutput);

  return result.map((output) => {
    const duration = Date.now() - startTime;

    // success: false の場合、上位でエラーとして扱われる
    if (!output.success) {
      throw new Error(output.error ?? 'Open command failed');
    }

    return {
      stdout: JSON.stringify(output),
      duration,
    };
  });
};
```

**注意**: `output.success === false` の場合、agent-browser自体はexitCode 1を返すため、
`executeCommand` の時点で `command_failed` エラーになります。
上記のチェックは冗長かもしれませんが、防御的プログラミングとして記載しています。

### 8.2. interaction.ts (click, type, fill, press)

```typescript
import { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { ClickCommand, TypeCommand, FillCommand, PressCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * click コマンドのハンドラ
 */
export const handleClick = async (
  command: ClickCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return executeCommand(
    'click',
    [command.selector, '--json'],
    context.executeOptions
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * type コマンドのハンドラ
 */
export const handleType = async (
  command: TypeCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return executeCommand(
    'type',
    [command.selector, command.value, '--json'],
    context.executeOptions
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * fill コマンドのハンドラ
 */
export const handleFill = async (
  command: FillCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return executeCommand(
    'fill',
    [command.selector, command.value, '--json'],
    context.executeOptions
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};

/**
 * press コマンドのハンドラ
 */
export const handlePress = async (
  command: PressCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return executeCommand(
    'press',
    [command.key, '--json'],
    context.executeOptions
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
```

### 8.3. assertions.ts (assertVisible, assertEnabled, assertChecked)

```typescript
import { Result, ok, err } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { AssertVisibleCommand, AssertEnabledCommand, AssertCheckedCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * assertVisible コマンドのハンドラ
 */
export const handleAssertVisible = async (
  command: AssertVisibleCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  const result = await executeCommand(
    'is',
    ['visible', command.selector, '--json'],
    context.executeOptions
  ).andThen(parseJsonOutput);

  return result.andThen((output) => {
    const duration = Date.now() - startTime;

    if (!output.success || !output.data || !(output.data as { visible: boolean }).visible) {
      return err({
        type: 'assertion_failed' as const,
        message: `Element "${command.selector}" is not visible`,
        command: 'is',
        args: ['visible', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      });
    }

    return ok({
      stdout: JSON.stringify(output),
      duration,
    });
  });
};

/**
 * assertEnabled コマンドのハンドラ
 */
export const handleAssertEnabled = async (
  command: AssertEnabledCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  const result = await executeCommand(
    'is',
    ['enabled', command.selector, '--json'],
    context.executeOptions
  ).andThen(parseJsonOutput);

  return result.andThen((output) => {
    const duration = Date.now() - startTime;

    if (!output.success || !output.data || !(output.data as { enabled: boolean }).enabled) {
      return err({
        type: 'assertion_failed' as const,
        message: `Element "${command.selector}" is not enabled`,
        command: 'is',
        args: ['enabled', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      });
    }

    return ok({
      stdout: JSON.stringify(output),
      duration,
    });
  });
};

/**
 * assertChecked コマンドのハンドラ
 */
export const handleAssertChecked = async (
  command: AssertCheckedCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  const result = await executeCommand(
    'is',
    ['checked', command.selector, '--json'],
    context.executeOptions
  ).andThen(parseJsonOutput);

  return result.andThen((output) => {
    const duration = Date.now() - startTime;

    // checkedの期待値とマッチするか確認
    const expectedChecked = command.checked ?? true; // デフォルトはtrue
    const actualChecked = output.data && (output.data as { checked: boolean }).checked;

    if (!output.success || actualChecked !== expectedChecked) {
      return err({
        type: 'assertion_failed' as const,
        message: `Element "${command.selector}" checked state is ${actualChecked}, expected ${expectedChecked}`,
        command: 'is',
        args: ['checked', command.selector],
        exitCode: 1,
        stderr: '',
        errorMessage: output.error,
      });
    }

    return ok({
      stdout: JSON.stringify(output),
      duration,
    });
  });
};
```

### 8.4. wait.ts (wait)

```typescript
import { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { WaitCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * wait コマンドのハンドラ
 *
 * WaitCommandは { ms: number } または { target: string } の2つの形式をサポート
 */
export const handleWait = async (
  command: WaitCommand,
  context: ExecutionContext
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  // ミリ秒指定の場合
  if ('ms' in command) {
    return executeCommand(
      'wait',
      [command.ms.toString(), '--json'],
      context.executeOptions
    )
      .andThen(parseJsonOutput)
      .map((output) => ({
        stdout: JSON.stringify(output),
        duration: Date.now() - startTime,
      }));
  }

  // セレクタ指定の場合
  return executeCommand(
    'wait',
    [command.target, '--json'],
    context.executeOptions
  )
    .andThen(parseJsonOutput)
    .map((output) => ({
      stdout: JSON.stringify(output),
      duration: Date.now() - startTime,
    }));
};
```

### 残りのコマンドハンドラ

以下のコマンドハンドラも同様のパターンで実装:

- `hover-select.ts`: handleHover, handleSelect
- `scroll.ts`: handleScroll, handleScrollIntoView
- `capture.ts`: handleScreenshot, handleSnapshot
- `eval.ts`: handleEval

実装パターンは interaction.ts とほぼ同じです。

---

## 9. index.ts

公開APIをre-exportします。

```typescript
/**
 * @packages/core/executor
 *
 * フロー実行エンジンとコマンドハンドラを提供する。
 */

// 関数
export { executeFlow } from './flow-executor';

// 型
export type {
  FlowResult,
  StepResult,
  FlowExecutionOptions,
  ExecutionErrorType,
} from './result';
```

---

## コーディング規約（CLAUDE.md準拠）

### neverthrow の使い方

```typescript
// 正しい: match, map, andThen でチェーン
result
  .andThen(parseJsonOutput)
  .map((output) => ({
    stdout: JSON.stringify(output),
    duration,
  }))
  .mapErr((e) => ({ ...e, context: 'additional info' }));

// 間違い: isOk, isErr で分岐
if (result.isOk()) {
  // ...
}
```

### エラーハンドリング

```typescript
// 正しい: 早期にエラーを検出
if (!selector) {
  return err({ type: 'validation_error', message: 'Selector is required' });
}

// 使用例
validateSelector(selector)
  .andThen(() => autoWait(selector, context))
  .andThen(() => executeCommand(...));
```

### 純粋関数

```typescript
// 正しい: 副作用なし
const expandString = (str: string, env: Record<string, string>): string => {
  return str.replace(/\$\{([^}]+)\}/g, (_, varName) => env[varName] ?? '');
};

// 間違い: 副作用あり
const expandString = (str: string, env: Record<string, string>): string => {
  env['_expanded'] = 'true'; // 引数を変更してはいけない
  return str.replace(...);
};
```

### class の使用について

**基本的にclassは使用禁止**ですが、FlowExecutorの実装で状態管理が必要な場合は例外的に許可されます。
ただし、**実装前にユーザーの承認が必要**です。

提案される実装では全て関数ベースで実装可能なため、classは不要です。

---

## テストの実装指針

### モックの使用

- `@packages/agent-browser-adapter` をモック
- `executeCommand` の戻り値を直接設定

### タイマーのモック

- `auto-wait.ts` のテストで `vi.useFakeTimers()` を使用
- `vi.advanceTimersByTimeAsync()` でポーリングをシミュレート

### 統合テスト

- 複数のステップを含むフローを実行
- 実際の型を使用してエンドツーエンドの動作を確認
