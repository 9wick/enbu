import type { CliError, ParsedArgs } from './types';
import { type Result, err, ok } from 'neverthrow';

/** デフォルトタイムアウト: 30秒 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * コマンドライン引数をパースする
 *
 * process.argvから渡された引数を解析し、ParsedArgs型に変換する。
 * バージョンフラグが指定されている場合は、他の引数に関わらずバージョンモードとして返す。
 * ヘルプフラグが指定されている場合は、他の引数に関わらずヘルプモードとして返す。
 * 最初の位置引数がinitの場合はinitコマンド、それ以外はrunコマンドとして扱う。
 *
 * @param argv - process.argv（インデックス2以降）
 * @returns パース済み引数、またはエラー
 */
export const parseArgs = (argv: string[]): Result<ParsedArgs, CliError> => {
  // バージョンフラグの確認
  if (argv.includes('-V') || argv.includes('--version')) {
    return ok({
      command: 'run',
      help: false,
      version: true,
      verbose: false,
      files: [],
      headed: false,
      env: {},
      timeout: DEFAULT_TIMEOUT_MS,
      screenshot: false,
      bail: false,
      progressJson: false,
    });
  }

  // ヘルプフラグの確認
  if (argv.includes('-h') || argv.includes('--help')) {
    return ok({
      command: 'run',
      help: true,
      version: false,
      verbose: false,
      files: [],
      headed: false,
      env: {},
      timeout: DEFAULT_TIMEOUT_MS,
      screenshot: false,
      bail: false,
      progressJson: false,
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
 *
 * initコマンドで利用可能なオプション（--force）を解析する。
 * 未知のオプションが指定された場合はエラーを返す。
 *
 * @param argv - initコマンド以降の引数配列
 * @param verbose - verboseフラグが有効かどうか
 * @returns パース済みのinit引数、またはエラー
 */
const parseInitArgs = (argv: string[], verbose: boolean): Result<ParsedArgs, CliError> => {
  const force = argv.includes('--force');

  // 未知のオプションチェック
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      if (arg !== '--force' && arg !== '--verbose') {
        return err({
          type: 'invalid_args',
          message: `Unknown option for init command: ${arg}`,
        });
      }
    } else if (arg.startsWith('-')) {
      if (arg !== '-v') {
        return err({
          type: 'invalid_args',
          message: `Unknown option for init command: ${arg}`,
        });
      }
    }
  }

  return ok({
    command: 'init',
    help: false,
    version: false,
    verbose,
    force,
  });
};

/**
 * runコマンドの引数をパースする
 *
 * runコマンドで利用可能なオプション（--headed, --env, --timeout等）を解析する。
 * --envは複数回指定可能で、KEY=VALUE形式でなければならない。
 * --timeoutは正の整数値でなければならない。
 * 位置引数（オプションフラグでない引数）は全てフローファイルパスとして扱う。
 *
 * @param argv - runコマンドの引数配列
 * @param verbose - verboseフラグが有効かどうか
 * @returns パース済みのrun引数、またはエラー
 */
const parseRunArgs = (argv: string[], verbose: boolean): Result<ParsedArgs, CliError> => {
  const files: string[] = [];
  const env: Record<string, string> = {};
  const state = {
    files,
    env,
    headed: false,
    timeout: DEFAULT_TIMEOUT_MS,
    screenshot: false,
    bail: false,
    session: undefined,
    progressJson: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const processResult = processRunArg(arg, argv, i, state);

    const continueResult = processResult.match(
      (newIndex) => {
        // インデックスの更新（値を取る引数の場合）
        i = newIndex;
        return ok(undefined);
      },
      (error) => err(error),
    );

    if (continueResult.isErr()) {
      return continueResult;
    }
  }

  return ok({
    command: 'run',
    help: false,
    version: false,
    verbose,
    files: state.files,
    headed: state.headed,
    env: state.env,
    timeout: state.timeout,
    screenshot: state.screenshot,
    bail: state.bail,
    session: state.session,
    progressJson: state.progressJson,
  });
};

/**
 * runコマンドの単一引数を処理する
 *
 * 各オプションに応じた処理を行い、新しいインデックスを返す。
 * 値を取る引数（--env, --timeout, --session）の場合はインデックスを+1する。
 *
 * @param arg - 現在の引数
 * @param argv - 全引数配列
 * @param currentIndex - 現在のインデックス
 * @param state - パース状態を保持するオブジェクト
 * @returns 成功時: 新しいインデックス、失敗時: エラー
 */
const processRunArg = (
  arg: string,
  argv: string[],
  currentIndex: number,
  state: {
    files: string[];
    env: Record<string, string>;
    headed: boolean;
    timeout: number;
    screenshot: boolean;
    bail: boolean;
    session: string | undefined;
    progressJson: boolean;
  },
): Result<number, CliError> => {
  // 値を取るオプション
  switch (arg) {
    case '--env':
      return parseEnvOption(argv, currentIndex, state);
    case '--timeout':
      return parseTimeoutOption(argv, currentIndex, state);
    case '--session':
      return parseSessionOption(argv, currentIndex, state);
    default:
      // フラグオプション（値を取らない）
      return processFlagArg(arg, currentIndex, state);
  }
};

/**
 * フラグ引数を処理する（値を取らない引数）
 *
 * @param arg - 現在の引数
 * @param currentIndex - 現在のインデックス
 * @param state - パース状態を保持するオブジェクト
 * @returns 成功時: 現在のインデックス、失敗時: エラー
 */
const processFlagArg = (
  arg: string,
  currentIndex: number,
  state: {
    files: string[];
    headed: boolean;
    screenshot: boolean;
    bail: boolean;
    progressJson: boolean;
  },
): Result<number, CliError> => {
  // 既知のフラグオプションの処理を試行
  const flagResult = tryProcessKnownFlag(arg, currentIndex, state);
  if (flagResult !== null) {
    return flagResult;
  }

  // 位置引数またはエラー
  return processPositionalOrUnknown(arg, currentIndex, state);
};

/**
 * 既知のフラグオプションを処理する
 *
 * @param arg - 現在の引数
 * @param currentIndex - 現在のインデックス
 * @param state - パース状態を保持するオブジェクト
 * @returns 既知のフラグの場合は処理結果、それ以外はnull
 */
const tryProcessKnownFlag = (
  arg: string,
  currentIndex: number,
  state: {
    headed: boolean;
    screenshot: boolean;
    bail: boolean;
    progressJson: boolean;
  },
): Result<number, CliError> | null => {
  // verboseは既に処理済みなのでスキップ
  if (arg === '-v' || arg === '--verbose') {
    return ok(currentIndex);
  }

  if (arg === '--headed') {
    state.headed = true;
    return ok(currentIndex);
  }

  if (arg === '--screenshot') {
    state.screenshot = true;
    return ok(currentIndex);
  }

  if (arg === '--bail') {
    state.bail = true;
    return ok(currentIndex);
  }

  if (arg === '--progress-json') {
    state.progressJson = true;
    return ok(currentIndex);
  }

  // 既知のフラグではない
  return null;
};

/**
 * 位置引数または未知のオプションを処理する
 *
 * @param arg - 現在の引数
 * @param currentIndex - 現在のインデックス
 * @param state - パース状態を保持するオブジェクト
 * @returns 成功時: 現在のインデックス、失敗時: エラー
 */
const processPositionalOrUnknown = (
  arg: string,
  currentIndex: number,
  state: { files: string[] },
): Result<number, CliError> => {
  if (arg.startsWith('--')) {
    return err({
      type: 'invalid_args',
      message: `Unknown option: ${arg}`,
    });
  }

  // 位置引数（フローファイル）
  state.files.push(arg);
  return ok(currentIndex);
};

/**
 * --env オプションをパースする
 */
const parseEnvOption = (
  argv: string[],
  currentIndex: number,
  state: { env: Record<string, string> },
): Result<number, CliError> => {
  const nextArg = argv[currentIndex + 1];
  if (!nextArg) {
    return err({
      type: 'invalid_args',
      message: '--env requires KEY=VALUE argument',
    });
  }

  const envResult = parseEnvArg(nextArg);
  if (envResult.isErr()) {
    return err(envResult.error);
  }

  const [key, value] = envResult.value;
  state.env[key] = value;

  return ok(currentIndex + 1);
};

/**
 * --timeout オプションをパースする
 */
const parseTimeoutOption = (
  argv: string[],
  currentIndex: number,
  state: { timeout: number },
): Result<number, CliError> => {
  const nextArg = argv[currentIndex + 1];
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

  state.timeout = timeoutNum;
  return ok(currentIndex + 1);
};

/**
 * --session オプションをパースする
 */
const parseSessionOption = (
  argv: string[],
  currentIndex: number,
  state: { session: string | undefined },
): Result<number, CliError> => {
  const nextArg = argv[currentIndex + 1];
  if (!nextArg) {
    return err({
      type: 'invalid_args',
      message: '--session requires a session name',
    });
  }

  state.session = nextArg;
  return ok(currentIndex + 1);
};

/**
 * --env KEY=VALUE 引数をパースする
 *
 * 環境変数の設定値をKEY=VALUE形式から解析する。
 * =が含まれていない、またはKEYが空の場合はエラーを返す。
 * VALUEは空文字列でも許可される。
 *
 * @param arg - KEY=VALUE形式の文字列
 * @returns 成功時: [KEY, VALUE]のタプル、失敗時: エラー
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
