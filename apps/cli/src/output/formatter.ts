import type { OutputTarget } from '../types';

/**
 * 出力フォーマッター
 *
 * console.log禁止のため、process.stdout.write / process.stderr.write を使用する。
 * 進捗表示やメッセージの整形を担当するクラス。
 * 状態を持つため、classとして実装することが許可されている。
 */
export class OutputFormatter {
  /** 詳細ログ出力を行うかどうか */
  private verbose: boolean;
  /** スピナーのアニメーションフレーム */
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  /** 現在表示中のスピナーフレームのインデックス */
  private spinnerIndex = 0;
  /** スピナーのsetIntervalのID（停止時にclearIntervalするため） */
  private spinnerIntervalId: NodeJS.Timeout | null = null;
  /** 現在表示中のスピナーメッセージ */
  private currentSpinnerMessage = '';

  /**
   * OutputFormatterのコンストラクタ
   *
   * @param verbose - 詳細ログ出力を行うかどうか
   */
  constructor(verbose: boolean) {
    this.verbose = verbose;
  }

  /**
   * 通常メッセージを出力
   *
   * 標準出力（stdout）にメッセージを出力します。
   * 一般的な情報や進捗状況を表示する際に使用します。
   *
   * @param message - 出力するメッセージ
   */
  info(message: string): void {
    this.write('stdout', message);
  }

  /**
   * エラーメッセージを出力
   *
   * 標準エラー出力（stderr）にメッセージを出力します。
   * エラーや警告メッセージを表示する際に使用します。
   *
   * @param message - 出力するエラーメッセージ
   */
  error(message: string): void {
    this.write('stderr', message);
  }

  /**
   * デバッグメッセージを出力（verboseモード時のみ）
   *
   * verboseフラグがtrueの場合のみ、標準エラー出力（stderr）に
   * デバッグメッセージを出力します。
   * "[DEBUG]"プレフィックスが自動的に付与されます。
   *
   * @param message - 出力するデバッグメッセージ
   */
  debug(message: string): void {
    if (this.verbose) {
      this.write('stderr', `[DEBUG] ${message}`);
    }
  }

  /**
   * 成功マーク付きメッセージ
   *
   * チェックマーク（✓）付きの成功メッセージを出力します。
   * オプションで実行時間（ミリ秒）を指定すると、秒単位で表示されます。
   *
   * @param message - 出力するメッセージ
   * @param durationMs - 実行時間（ミリ秒、省略可）
   */
  success(message: string, durationMs?: number): void {
    const duration = durationMs !== undefined ? ` (${(durationMs / 1000).toFixed(1)}s)` : '';
    this.info(`  ✓ ${message}${duration}`);
  }

  /**
   * 失敗マーク付きメッセージ
   *
   * バツマーク（✗）付きの失敗メッセージを出力します。
   * オプションで実行時間（ミリ秒）を指定すると、秒単位で表示されます。
   *
   * @param message - 出力するメッセージ
   * @param durationMs - 実行時間（ミリ秒、省略可）
   */
  failure(message: string, durationMs?: number): void {
    const duration = durationMs !== undefined ? ` (${(durationMs / 1000).toFixed(1)}s)` : '';
    this.error(`  ✗ ${message}${duration}`);
  }

  /**
   * インデント付きメッセージ（エラー詳細等）
   *
   * 指定されたレベル分のインデント（2スペース × レベル）を付けて
   * メッセージを標準エラー出力に出力します。
   * エラーの詳細情報や補足説明を階層的に表示する際に使用します。
   *
   * @param message - 出力するメッセージ
   * @param level - インデントレベル（デフォルト: 1）
   */
  indent(message: string, level = 1): void {
    const indent = '  '.repeat(level);
    this.error(`${indent}${message}`);
  }

  /**
   * スピナーを開始
   *
   * 指定されたメッセージと共にスピナーアニメーションを開始します。
   * スピナーは80msごとにフレームが更新されます。
   * 既に実行中のスピナーがある場合は、停止してから新しいスピナーを開始します。
   *
   * 注意: 必ずstopSpinner()を呼び出してスピナーを停止してください。
   * 停止しないとsetIntervalが残り続けます。
   *
   * @param message - スピナーと共に表示するメッセージ
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
   *
   * 実行中のスピナーを停止し、スピナー行をクリアします。
   * setIntervalを適切にクリアして、リソースリークを防ぎます。
   * スピナーが実行中でない場合は何もしません。
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
   *
   * 視覚的にセクションを区切るための水平線を出力します。
   * サマリー表示や大きな処理の区切りに使用します。
   */
  separator(): void {
    this.info('────────────────────────────────────────');
  }

  /**
   * 改行
   *
   * 空行を出力します。
   * メッセージ間に視覚的な余白を作る際に使用します。
   */
  newline(): void {
    this.write('stdout', '');
  }

  /**
   * 内部：書き込み処理
   *
   * 指定された出力先（stdout または stderr）にメッセージを書き込みます。
   * メッセージの末尾には自動的に改行文字が付与されます。
   *
   * @param target - 出力先（'stdout' または 'stderr'）
   * @param message - 出力するメッセージ
   */
  private write(target: OutputTarget, message: string): void {
    const output = target === 'stdout' ? process.stdout : process.stderr;
    output.write(`${message}\n`);
  }

  /**
   * 内部：スピナーを描画
   *
   * 現在のスピナーフレームとメッセージを画面に描画します。
   * カーソルを行頭に戻してから描画することで、
   * 前のフレームを上書きしてアニメーション効果を実現します。
   */
  private renderSpinner(): void {
    const frame = this.spinnerFrames[this.spinnerIndex];
    this.clearLine();
    process.stdout.write(`  ${frame} ${this.currentSpinnerMessage}`);
  }

  /**
   * 内部：現在行をクリア
   *
   * カーソルを行頭に戻し（\r）、行全体をクリア（\x1b[K）します。
   * スピナーのアニメーションや、前の出力を上書きする際に使用します。
   * ANSIエスケープシーケンスを使用しています。
   */
  private clearLine(): void {
    process.stdout.write('\r\x1b[K');
  }
}

/**
 * ヘルプメッセージを表示
 *
 * CLIの使用方法を標準出力に表示します。
 * コマンドラインオプション、サブコマンド、使用例などを含みます。
 * --help フラグまたは -h フラグが指定された際に呼び出されます。
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
  -V, --version     Show version number
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

/**
 * バージョン情報を表示
 *
 * CLIのバージョン番号を標準出力に表示します。
 * ビルド時に埋め込まれたバージョン情報（__VERSION__定数）を使用します。
 * --version フラグまたは -V フラグが指定された際に呼び出されます。
 *
 * 実装の詳細:
 * tsdown.config.tsのdefineオプションにより、__VERSION__定数が
 * ビルド時にpackage.jsonのバージョン情報で置換されます。
 * これにより、実行時のファイル読み込みオーバーヘッドがなく、
 * ビルド構造の変更にも影響を受けません。
 */
export const showVersion = (): void => {
  process.stdout.write(`${__VERSION__}\n`);
};
