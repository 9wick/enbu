# Phase 4: 実装ガイド

このドキュメントは `@apps/cli` の実装詳細を説明します。

---

## ファイル構成

```
apps/cli/src/
├── main.ts              # CLIエントリポイント（bin）
├── types.ts             # CLI固有の型定義
├── args-parser.ts       # 引数パース
├── commands/
│   ├── init.ts          # initコマンド
│   └── run.ts           # runコマンド（デフォルト）
├── output/
│   ├── formatter.ts     # 進捗・結果表示
│   └── exit-code.ts     # 終了コード管理
└── utils/
    └── fs.ts            # ファイルシステム操作ユーティリティ
```

---

## 1. types.ts

CLI全体で使用する型定義を一箇所にまとめます。

```typescript
/**
 * @apps/cli の型定義
 */

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
 * CLI実行エラー型
 */
export type CliError =
  | { type: 'invalid_args'; message: string }
  | { type: 'execution_error'; message: string; cause?: unknown };

/**
 * フロー実行結果
 */
export type FlowExecutionResult = {
  passed: number;
  failed: number;
  total: number;
};

/**
 * 出力先（stdout / stderr）
 */
export type OutputTarget = 'stdout' | 'stderr';

/**
 * ログレベル
 */
export type LogLevel = 'info' | 'error' | 'debug';
```

---

## 2. args-parser.ts

コマンドライン引数をパースします。

### 実装方針

1. `process.argv` から引数を取得
2. コマンドを判定（`init` または `run`）
3. オプションフラグ（`--` で始まる）をパース
4. 位置引数（フローファイル）を収集
5. Result型で返却

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import type { ParsedArgs, CliError } from './types';

/** デフォルトタイムアウト: 30秒 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * コマンドライン引数をパースする
 *
 * @param argv - process.argv（インデックス2以降）
 * @returns パース済み引数、またはエラー
 */
export const parseArgs = (argv: string[]): Result<ParsedArgs, CliError> => {
  // ヘルプフラグの確認
  if (argv.includes('-h') || argv.includes('--help')) {
    return ok({
      command: 'run',
      help: true,
      verbose: false,
      files: [],
      headed: false,
      env: {},
      timeout: DEFAULT_TIMEOUT_MS,
      screenshot: false,
      bail: false,
    });
  }

  // verboseフラグ
  const verbose = argv.includes('-v') || argv.includes('--verbose');

  // コマンド判定
  const firstArg = argv[0];
  if (firstArg === 'init') {
    return parseInitArgs(argv.slice(1), verbose);
  }

  // デフォルトはrunコマンド
  return parseRunArgs(argv, verbose);
};

/**
 * initコマンドの引数をパースする
 */
const parseInitArgs = (
  argv: string[],
  verbose: boolean
): Result<ParsedArgs, CliError> => {
  const force = argv.includes('--force');

  return ok({
    command: 'init',
    help: false,
    verbose,
    force,
  });
};

/**
 * runコマンドの引数をパースする
 */
const parseRunArgs = (
  argv: string[],
  verbose: boolean
): Result<ParsedArgs, CliError> => {
  const files: string[] = [];
  const env: Record<string, string> = {};
  let headed = false;
  let timeout = DEFAULT_TIMEOUT_MS;
  let screenshot = false;
  let bail = false;
  let session: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--headed') {
      headed = true;
    } else if (arg === '--env') {
      // 次の引数を取得
      const nextArg = argv[++i];
      if (!nextArg) {
        return err({
          type: 'invalid_args',
          message: '--env requires KEY=VALUE argument',
        });
      }
      const envResult = parseEnvArg(nextArg);
      if (envResult.isErr()) {
        return envResult;
      }
      const [key, value] = envResult.value;
      env[key] = value;
    } else if (arg === '--timeout') {
      const nextArg = argv[++i];
      if (!nextArg) {
        return err({
          type: 'invalid_args',
          message: '--timeout requires a number in milliseconds',
        });
      }
      const timeoutNum = Number.parseInt(nextArg, 10);
      if (Number.isNaN(timeoutNum) || timeoutNum <= 0) {
        return err({
          type: 'invalid_args',
          message: `--timeout must be a positive number, got: ${nextArg}`,
        });
      }
      timeout = timeoutNum;
    } else if (arg === '--screenshot') {
      screenshot = true;
    } else if (arg === '--bail') {
      bail = true;
    } else if (arg === '--session') {
      const nextArg = argv[++i];
      if (!nextArg) {
        return err({
          type: 'invalid_args',
          message: '--session requires a session name',
        });
      }
      session = nextArg;
    } else if (arg === '-v' || arg === '--verbose') {
      // 既に処理済み
      continue;
    } else if (arg.startsWith('--')) {
      return err({
        type: 'invalid_args',
        message: `Unknown option: ${arg}`,
      });
    } else {
      // 位置引数（フローファイル）
      files.push(arg);
    }
  }

  return ok({
    command: 'run',
    help: false,
    verbose,
    files,
    headed,
    env,
    timeout,
    screenshot,
    bail,
    session,
  });
};

/**
 * --env KEY=VALUE 引数をパースする
 */
const parseEnvArg = (arg: string): Result<[string, string], CliError> => {
  const index = arg.indexOf('=');
  if (index === -1) {
    return err({
      type: 'invalid_args',
      message: `--env argument must be in KEY=VALUE format, got: ${arg}`,
    });
  }

  const key = arg.slice(0, index);
  const value = arg.slice(index + 1);

  if (key.length === 0) {
    return err({
      type: 'invalid_args',
      message: `--env KEY cannot be empty, got: ${arg}`,
    });
  }

  return ok([key, value]);
};
```

### 注意点

- `--env` は複数回指定可能（`--env USER=test --env PASSWORD=secret`）
- `--timeout` は数値バリデーション必須
- 未知のオプションはエラーとして扱う
- 位置引数は全てフローファイルとして扱う

---

## 3. output/formatter.ts

進捗・結果を標準出力に表示します。

### 実装方針

1. `process.stdout.write` / `process.stderr.write` を使用（`console.log`禁止）
2. 進捗表示は上書き可能なスピナーで実装
3. 結果は読みやすいフォーマットで出力
4. verboseモードではデバッグ情報を追加

### コード構造

```typescript
import type { LogLevel, OutputTarget } from '../types';

/**
 * 出力フォーマッター
 *
 * console.log禁止のため、process.stdout.write / process.stderr.write を使用する。
 */
export class OutputFormatter {
  private verbose: boolean;
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;
  private spinnerIntervalId: NodeJS.Timeout | null = null;
  private currentSpinnerMessage = '';

  constructor(verbose: boolean) {
    this.verbose = verbose;
  }

  /**
   * 通常メッセージを出力
   */
  info(message: string): void {
    this.write('stdout', message);
  }

  /**
   * エラーメッセージを出力
   */
  error(message: string): void {
    this.write('stderr', message);
  }

  /**
   * デバッグメッセージを出力（verboseモード時のみ）
   */
  debug(message: string): void {
    if (this.verbose) {
      this.write('stderr', `[DEBUG] ${message}`);
    }
  }

  /**
   * 成功マーク付きメッセージ
   */
  success(message: string, durationMs?: number): void {
    const duration = durationMs !== undefined ? ` (${(durationMs / 1000).toFixed(1)}s)` : '';
    this.info(`  ✓ ${message}${duration}`);
  }

  /**
   * 失敗マーク付きメッセージ
   */
  failure(message: string, durationMs?: number): void {
    const duration = durationMs !== undefined ? ` (${(durationMs / 1000).toFixed(1)}s)` : '';
    this.error(`  ✗ ${message}${duration}`);
  }

  /**
   * インデント付きメッセージ（エラー詳細等）
   */
  indent(message: string, level = 1): void {
    const indent = '  '.repeat(level);
    this.error(`${indent}${message}`);
  }

  /**
   * スピナーを開始
   */
  startSpinner(message: string): void {
    this.currentSpinnerMessage = message;
    this.spinnerIndex = 0;

    // 既存のスピナーをクリア
    if (this.spinnerIntervalId !== null) {
      clearInterval(this.spinnerIntervalId);
    }

    // スピナーを表示
    this.renderSpinner();

    // 定期的に更新
    this.spinnerIntervalId = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
      this.renderSpinner();
    }, 80);
  }

  /**
   * スピナーを停止
   */
  stopSpinner(): void {
    if (this.spinnerIntervalId !== null) {
      clearInterval(this.spinnerIntervalId);
      this.spinnerIntervalId = null;
    }

    // スピナー行をクリア
    this.clearLine();
  }

  /**
   * セクション区切り線
   */
  separator(): void {
    this.info('────────────────────────────────────────');
  }

  /**
   * 改行
   */
  newline(): void {
    this.write('stdout', '');
  }

  /**
   * 内部：書き込み処理
   */
  private write(target: OutputTarget, message: string): void {
    const output = target === 'stdout' ? process.stdout : process.stderr;
    output.write(`${message}\n`);
  }

  /**
   * 内部：スピナーを描画
   */
  private renderSpinner(): void {
    const frame = this.spinnerFrames[this.spinnerIndex];
    this.clearLine();
    process.stdout.write(`  ${frame} ${this.currentSpinnerMessage}`);
  }

  /**
   * 内部：現在行をクリア
   */
  private clearLine(): void {
    process.stdout.write('\r\x1b[K');
  }
}

/**
 * ヘルプメッセージを表示
 */
export const showHelp = (): void => {
  const helpText = `
agent-browser-flow - CLI for agent-browser workflow automation

USAGE:
  npx agent-browser-flow [command] [options] [flow-files...]

COMMANDS:
  init              Initialize a new project
  (default)         Run flow files

OPTIONS:
  -h, --help        Show this help message
  -v, --verbose     Enable verbose logging
  --headed          Show browser (disable headless mode)
  --env KEY=VALUE   Set environment variable (can be used multiple times)
  --timeout <ms>    Set timeout in milliseconds (default: 30000)
  --screenshot      Save screenshot on failure
  --bail            Stop on first failure
  --session <name>  Set agent-browser session name

EXAMPLES:
  npx agent-browser-flow init
  npx agent-browser-flow
  npx agent-browser-flow login.flow.yaml
  npx agent-browser-flow --headed --env USER=test login.flow.yaml
  npx agent-browser-flow --bail login.flow.yaml checkout.flow.yaml

For more information, visit: https://github.com/9wick/agent-browser-flow
`;

  process.stdout.write(helpText);
};
```

### スピナーの動作

- `startSpinner(message)` でスピナー開始
- 80msごとにフレームを更新（`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` を順に表示）
- `stopSpinner()` でスピナー停止、行をクリア
- その後、`success()` または `failure()` で結果を表示

---

## 4. output/exit-code.ts

終了コードを管理します。

```typescript
/**
 * 終了コード定義
 */
export const EXIT_CODE = {
  /** 成功 */
  SUCCESS: 0,
  /** フロー実行失敗 */
  FLOW_FAILED: 1,
  /** 実行エラー（agent-browser未インストール等） */
  EXECUTION_ERROR: 2,
} as const;

/**
 * 終了コードで終了する
 *
 * @param code - 終了コード
 */
export const exitWithCode = (code: number): never => {
  process.exit(code);
};
```

---

## 5. utils/fs.ts

ファイルシステム操作のユーティリティ。

### 実装方針

1. `fs/promises` を使用
2. 全ての操作をResult型でラップ
3. 既存ファイルの上書き判定

### コード構造

```typescript
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Result, ok, err, fromPromise } from 'neverthrow';
import type { CliError } from '../types';

/**
 * ファイルが存在するか確認
 */
export const fileExists = (path: string): Promise<boolean> => {
  return access(path, constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

/**
 * ディレクトリを作成（存在しない場合のみ）
 *
 * @param path - ディレクトリパス
 * @returns 成功時: void、失敗時: CliError
 */
export const createDirectory = (path: string): Promise<Result<void, CliError>> => {
  return fromPromise(
    mkdir(path, { recursive: true }),
    (error): CliError => ({
      type: 'execution_error',
      message: `Failed to create directory: ${path}`,
      cause: error,
    })
  ).map(() => undefined);
};

/**
 * ファイルを書き込み
 *
 * @param path - ファイルパス
 * @param content - ファイル内容
 * @returns 成功時: void、失敗時: CliError
 */
export const writeFileContent = (
  path: string,
  content: string
): Promise<Result<void, CliError>> => {
  return fromPromise(
    writeFile(path, content, 'utf-8'),
    (error): CliError => ({
      type: 'execution_error',
      message: `Failed to write file: ${path}`,
      cause: error,
    })
  ).map(() => undefined);
};

/**
 * ファイルを読み込み
 *
 * @param path - ファイルパス
 * @returns 成功時: ファイル内容、失敗時: CliError
 */
export const readFileContent = (path: string): Promise<Result<string, CliError>> => {
  return fromPromise(
    readFile(path, 'utf-8'),
    (error): CliError => ({
      type: 'execution_error',
      message: `Failed to read file: ${path}`,
      cause: error,
    })
  );
};
```

---

## 6. commands/init.ts

initコマンドの実装。

### 実装方針

1. `.abflow/` ディレクトリを作成
2. サンプルフローファイル `.abflow/example.flow.yaml` を生成
3. `.gitignore` への追記を提案（対話的確認）

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import type { CliError } from '../types';
import { OutputFormatter } from '../output/formatter';
import {
  fileExists,
  createDirectory,
  writeFileContent,
  readFileContent,
} from '../utils/fs';

/** 生成するディレクトリ */
const ABFLOW_DIR = '.abflow';

/** サンプルフローファイルの内容 */
const SAMPLE_FLOW_YAML = `name: Example Flow
description: agent-browser-flowのサンプルフロー
steps:
  - action: open
    url: https://example.com
  - action: click
    target: More information...
`;

/**
 * initコマンドを実行
 *
 * @param args - initコマンドの引数
 * @returns 成功時: void、失敗時: CliError
 */
export const runInitCommand = async (args: {
  force: boolean;
  verbose: boolean;
}): Promise<Result<void, CliError>> => {
  const formatter = new OutputFormatter(args.verbose);

  formatter.info('Initializing agent-browser-flow project...');

  // .abflow/ ディレクトリを作成
  const abflowPath = resolve(process.cwd(), ABFLOW_DIR);
  const abflowExists = await fileExists(abflowPath);

  if (abflowExists && !args.force) {
    formatter.success(`Directory already exists: ${ABFLOW_DIR}`);
  } else {
    const createDirResult = await createDirectory(abflowPath);
    if (createDirResult.isErr()) {
      return createDirResult;
    }
    formatter.success(`Created ${ABFLOW_DIR}/ directory`);
  }

  // example.flow.yaml を生成
  const exampleFlowPath = resolve(abflowPath, 'example.flow.yaml');
  const exampleFlowExists = await fileExists(exampleFlowPath);

  if (exampleFlowExists && !args.force) {
    formatter.success(`File already exists: ${ABFLOW_DIR}/example.flow.yaml`);
  } else {
    const writeResult = await writeFileContent(exampleFlowPath, SAMPLE_FLOW_YAML);
    if (writeResult.isErr()) {
      return writeResult;
    }
    formatter.success(`Created ${ABFLOW_DIR}/example.flow.yaml`);
  }

  // .gitignore への追記を提案
  formatter.newline();
  const shouldUpdateGitignore = await askYesNo(
    'Would you like to add .abflow/ to .gitignore? (y/N): '
  );

  if (shouldUpdateGitignore) {
    const gitignorePath = resolve(process.cwd(), '.gitignore');
    const updateResult = await updateGitignore(gitignorePath);

    updateResult.match(
      () => formatter.success('Updated .gitignore'),
      (error) => {
        formatter.error(`Failed to update .gitignore: ${error.message}`);
        formatter.indent('You can manually add ".abflow/" to your .gitignore file', 1);
      }
    );
  }

  formatter.newline();
  formatter.info('Initialization complete!');
  formatter.info(`Try: npx agent-browser-flow ${ABFLOW_DIR}/example.flow.yaml`);

  return ok(undefined);
};

/**
 * Yes/No 質問を対話的に行う
 */
const askYesNo = (question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
};

/**
 * .gitignore に .abflow/ を追記
 */
const updateGitignore = async (path: string): Promise<Result<void, CliError>> => {
  const exists = await fileExists(path);
  const entry = '.abflow/';

  if (!exists) {
    // .gitignore が存在しない場合、新規作成
    return writeFileContent(path, `${entry}\n`);
  }

  // 既存の .gitignore を読み込み
  const readResult = await readFileContent(path);
  if (readResult.isErr()) {
    return readResult.asyncAndThen(() => ok(undefined));
  }

  const content = readResult.value;

  // 既に .abflow/ が含まれている場合はスキップ
  if (content.includes(entry)) {
    return ok(undefined);
  }

  // 追記
  const newContent = content.endsWith('\n') ? `${content}${entry}\n` : `${content}\n${entry}\n`;
  return writeFileContent(path, newContent);
};
```

### 対話的確認

- `readline` の `createInterface` を使用
- Yes/No を入力させ、`y` または `yes` の場合に `.gitignore` を更新

---

## 7. commands/run.ts

runコマンドの実装。

### 実装方針

1. agent-browserインストール確認（Phase 1）
2. フローファイル読み込み（Phase 2）
3. 各フローを順次実行（Phase 3）
4. 進捗・結果を表示
5. 終了コードを設定

### コード構造

```typescript
import { Result, ok, err } from 'neverthrow';
import { resolve } from 'node:path';
import { glob } from 'glob';
import type { CliError, FlowExecutionResult } from '../types';
import { OutputFormatter } from '../output/formatter';
import { checkAgentBrowser } from '@packages/agent-browser-adapter';
import { loadFlows, executeFlow, type FlowResult } from '@packages/core';

/**
 * runコマンドを実行
 *
 * @param args - runコマンドの引数
 * @returns 成功時: 実行結果、失敗時: CliError
 */
export const runFlowCommand = async (args: {
  files: string[];
  headed: boolean;
  env: Record<string, string>;
  timeout: number;
  screenshot: boolean;
  bail: boolean;
  session?: string;
  verbose: boolean;
}): Promise<Result<FlowExecutionResult, CliError>> => {
  const formatter = new OutputFormatter(args.verbose);

  formatter.debug(`Args: ${JSON.stringify(args)}`);

  // 1. agent-browserインストール確認
  formatter.info('Checking agent-browser...');
  formatter.debug('Checking agent-browser installation...');

  const checkResult = await checkAgentBrowser();
  if (checkResult.isErr()) {
    const error = checkResult.error;
    formatter.failure('agent-browser is not installed');
    formatter.newline();
    formatter.error('Error: agent-browser is not installed');
    formatter.error('Please install it with: npm install -g agent-browser');
    return err({
      type: 'execution_error',
      message: error.message,
    });
  }

  formatter.success('agent-browser is installed');
  formatter.newline();

  // 2. フローファイル解決
  const flowFilesResult = await resolveFlowFiles(args.files);
  if (flowFilesResult.isErr()) {
    return flowFilesResult.asyncAndThen(() => ok({ passed: 0, failed: 0, total: 0 }));
  }

  const flowFiles = flowFilesResult.value;

  if (flowFiles.length === 0) {
    formatter.error('Error: No flow files found');
    formatter.error('Try: npx agent-browser-flow init');
    return err({
      type: 'execution_error',
      message: 'No flow files found',
    });
  }

  // 3. フローファイル読み込み
  formatter.info('Loading flows...');
  formatter.debug(`Loading flows from: ${flowFiles.join(', ')}`);

  const loadResult = await loadFlows(flowFiles);
  if (loadResult.isErr()) {
    const error = loadResult.error;
    formatter.failure(`Failed to load flows: ${error.message}`);
    return err({
      type: 'execution_error',
      message: `Failed to load flows: ${error.message}`,
      cause: error,
    });
  }

  const flows = loadResult.value;
  formatter.success(`Loaded ${flows.length} flow(s)`);
  formatter.newline();

  // 4. フロー実行
  let passed = 0;
  let failed = 0;

  for (const flow of flows) {
    formatter.info(`Running: ${flow.name}.flow.yaml`);
    formatter.debug(`Executing flow: ${flow.name} (${flow.steps.length} steps)`);

    const startTime = Date.now();

    // フロー実行
    const executeResult = await executeFlowWithProgress(flow, args, formatter);

    const duration = Date.now() - startTime;

    executeResult.match(
      (result) => {
        if (result.success) {
          passed++;
          formatter.newline();
          formatter.success(`PASSED: ${flow.name}.flow.yaml`, duration);
        } else {
          failed++;
          formatter.newline();
          formatter.failure(`FAILED: ${flow.name}.flow.yaml`, duration);
          if (result.error) {
            formatter.indent(`Step ${result.failedStepIndex! + 1} failed: ${result.error}`, 1);
          }
        }
      },
      (error) => {
        failed++;
        formatter.newline();
        formatter.failure(`FAILED: ${flow.name}.flow.yaml`, duration);
        formatter.indent(error.message, 1);
      }
    );

    formatter.newline();

    // --bail フラグが指定されていて、失敗した場合は中断
    if (args.bail && failed > 0) {
      formatter.error('Stopping due to --bail flag');
      formatter.newline();
      break;
    }
  }

  // 5. サマリー表示
  formatter.separator();
  const total = passed + failed;
  formatter.info(`Summary: ${passed}/${total} flows passed (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

  if (failed > 0) {
    formatter.newline();
    formatter.error(`Exit code: 1`);
  }

  return ok({ passed, failed, total });
};

/**
 * フローファイルを解決
 *
 * 指定がない場合は .abflow/ 配下の全 .flow.yaml ファイルを検索
 */
const resolveFlowFiles = async (files: string[]): Promise<Result<string[], CliError>> => {
  if (files.length > 0) {
    // ファイルパスが指定されている場合、そのまま使用
    return ok(files.map((f) => resolve(process.cwd(), f)));
  }

  // 指定がない場合、.abflow/ 配下を検索
  try {
    const pattern = resolve(process.cwd(), '.abflow', '*.flow.yaml');
    const matched = await glob(pattern);
    return ok(matched);
  } catch (error) {
    return err({
      type: 'execution_error',
      message: 'Failed to search for flow files',
      cause: error,
    });
  }
};

/**
 * フローを実行しながら進捗を表示
 */
const executeFlowWithProgress = async (
  flow: Flow,
  args: {
    headed: boolean;
    env: Record<string, string>;
    timeout: number;
    screenshot: boolean;
    session?: string;
    verbose: boolean;
  },
  formatter: OutputFormatter
): Promise<Result<FlowResult, CliError>> => {
  // セッション名を生成（指定がない場合）
  const sessionName = args.session ?? `abf-${Date.now()}`;

  // 各ステップを実行
  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    const stepDescription = formatStepDescription(step);

    formatter.debug(`Step ${i + 1}: ${stepDescription}`);
    formatter.startSpinner(stepDescription);

    const stepStartTime = Date.now();

    // ステップ実行（Phase 3のAPIを使用）
    // ※ この部分は Phase 3 の実装に依存するため、仮の実装
    const stepResult = await executeStep(step, {
      sessionName,
      headed: args.headed,
      timeout: args.timeout,
      env: args.env,
    });

    const stepDuration = Date.now() - stepStartTime;
    formatter.stopSpinner();

    stepResult.match(
      () => formatter.success(stepDescription, stepDuration),
      (error) => {
        formatter.failure(stepDescription, stepDuration);
        formatter.indent(`Error: ${error.message}`, 2);
      }
    );

    if (stepResult.isErr()) {
      // ステップ失敗
      return ok({
        success: false,
        flowName: flow.name,
        totalSteps: flow.steps.length,
        completedSteps: i,
        failedStepIndex: i,
        error: stepResult.error.message,
      });
    }
  }

  // 全ステップ成功
  return ok({
    success: true,
    flowName: flow.name,
    totalSteps: flow.steps.length,
    completedSteps: flow.steps.length,
  });
};

/**
 * ステップの説明を生成
 */
const formatStepDescription = (step: FlowStep): string => {
  switch (step.action) {
    case 'open':
      return `open ${step.url}`;
    case 'click':
      return `click "${step.target}"`;
    case 'type':
      return `type "${step.target}"`;
    case 'wait':
      return `wait ${step.duration}ms`;
    default:
      return `${step.action}`;
  }
};

/**
 * ステップを実行（Phase 3のAPIを使用）
 *
 * ※ Phase 3の実装に依存するため、ここでは仮実装
 */
const executeStep = async (
  step: FlowStep,
  options: {
    sessionName: string;
    headed: boolean;
    timeout: number;
    env: Record<string, string>;
  }
): Promise<Result<void, CliError>> => {
  // Phase 3 の executeStep を呼び出す
  // 実装例（Phase 3 の API に依存）:
  // return executeStepFromCore(step, options).mapErr((e) => ({
  //   type: 'execution_error',
  //   message: e.message,
  //   cause: e,
  // }));

  // 仮実装
  return ok(undefined);
};
```

### 進捗表示の流れ

1. `startSpinner(description)` でスピナー開始
2. ステップ実行
3. `stopSpinner()` でスピナー停止
4. `success()` または `failure()` で結果表示

---

## 8. main.ts

CLIのエントリポイント。

### 実装方針

1. コマンドライン引数をパース
2. ヘルプ表示
3. コマンド実行（init / run）
4. 終了コード設定

### コード構造

```typescript
#!/usr/bin/env node

import { parseArgs } from './args-parser';
import { runInitCommand } from './commands/init';
import { runFlowCommand } from './commands/run';
import { showHelp } from './output/formatter';
import { EXIT_CODE, exitWithCode } from './output/exit-code';

/**
 * CLIエントリポイント
 */
const main = async (): Promise<void> => {
  // 引数パース
  const argsResult = parseArgs(process.argv.slice(2));

  if (argsResult.isErr()) {
    const error = argsResult.error;
    process.stderr.write(`Error: ${error.message}\n`);
    process.stderr.write('Try: npx agent-browser-flow --help\n');
    exitWithCode(EXIT_CODE.EXECUTION_ERROR);
  }

  const args = argsResult.value;

  // ヘルプ表示
  if (args.help) {
    showHelp();
    exitWithCode(EXIT_CODE.SUCCESS);
  }

  // コマンド実行
  if (args.command === 'init') {
    const result = await runInitCommand({
      force: args.force,
      verbose: args.verbose,
    });

    result.match(
      () => exitWithCode(EXIT_CODE.SUCCESS),
      (error) => {
        process.stderr.write(`Error: ${error.message}\n`);
        exitWithCode(EXIT_CODE.EXECUTION_ERROR);
      }
    );
  } else {
    const result = await runFlowCommand({
      files: args.files,
      headed: args.headed,
      env: args.env,
      timeout: args.timeout,
      screenshot: args.screenshot,
      bail: args.bail,
      session: args.session,
      verbose: args.verbose,
    });

    result.match(
      (executionResult) => {
        const exitCode =
          executionResult.failed > 0 ? EXIT_CODE.FLOW_FAILED : EXIT_CODE.SUCCESS;
        exitWithCode(exitCode);
      },
      (error) => {
        process.stderr.write(`Error: ${error.message}\n`);
        exitWithCode(EXIT_CODE.EXECUTION_ERROR);
      }
    );
  }
};

// エントリポイント実行
main();
```

### shebang

- ファイルの先頭に `#!/usr/bin/env node` を記述
- 実行可能ファイルとしてビルドされる

---

## コーディング規約（CLAUDE.md準拠）

### neverthrow の使い方

```typescript
// 正しい: match, map, andThen でチェーン
result
  .andThen(parseJsonOutput)
  .map((output) => output.data)
  .match(
    (data) => { /* 成功 */ },
    (error) => { /* 失敗 */ }
  );

// 間違い: isOk, isErr で分岐
if (result.isOk()) {
  // 避けるべき
}
```

### 純粋関数

```typescript
// 正しい: 副作用なし
const formatMessage = (name: string, duration: number): string => {
  return `${name} (${duration}ms)`;
};

// 間違い: 副作用あり（出力）
const formatMessage = (name: string, duration: number): string => {
  console.log(name); // 副作用
  return `${name} (${duration}ms)`;
};
```

### console.log 禁止

```typescript
// 正しい: process.stdout.write / process.stderr.write を使用
process.stdout.write('Success\n');
process.stderr.write('Error\n');

// 間違い: console.log を使用
console.log('Success'); // 禁止
```

---

## 依存パッケージ

### 必要な追加パッケージ

- `glob`: フローファイル検索用

```bash
pnpm add glob
pnpm add -D @types/glob
```

### package.json の更新

```json
{
  "dependencies": {
    "@packages/core": "workspace:*",
    "@packages/agent-browser-adapter": "workspace:*",
    "neverthrow": "^8.2.0",
    "glob": "^10.3.10"
  }
}
```

---

## ビルド設定

### tsdown設定（nx.json）

```json
{
  "targets": {
    "build": {
      "executor": "@nx/js:tsdown",
      "options": {
        "main": "apps/cli/src/main.ts",
        "outputPath": "apps/cli/dist",
        "format": ["esm"],
        "shims": true
      }
    }
  }
}
```

### 実行可能ファイル化

- ビルド後、`dist/main.mjs` が生成される
- `package.json` の `bin` フィールドで実行可能ファイルを指定
- `chmod +x` は不要（Node.jsがshebangを認識）

---

## テスト時の注意

### process.stdout / process.stderr のモック

テスト時は標準出力をモックして、実際の出力を抑制します。

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

let stdoutWrite: typeof process.stdout.write;
let stderrWrite: typeof process.stderr.write;

beforeEach(() => {
  stdoutWrite = process.stdout.write;
  stderrWrite = process.stderr.write;

  process.stdout.write = vi.fn() as any;
  process.stderr.write = vi.fn() as any;
});

afterEach(() => {
  process.stdout.write = stdoutWrite;
  process.stderr.write = stderrWrite;
});
```

### process.exit のモック

`process.exit` を呼び出すとテストプロセスが終了してしまうため、モックが必要です。

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

let processExit: typeof process.exit;

beforeEach(() => {
  processExit = process.exit;
  process.exit = vi.fn() as any;
});

afterEach(() => {
  process.exit = processExit;
});
```
