/**
 * フローランナー
 *
 * CLIプロセスを起動し、進捗JSONを解析してイベントを発行する。
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ProgressMessage } from './types';

/**
 * フローランナーイベント型定義
 */
export interface FlowRunnerEvents {
  'flow:start': (message: ProgressMessage & { type: 'flow:start' }) => void;
  'step:start': (message: ProgressMessage & { type: 'step:start' }) => void;
  'step:complete': (message: ProgressMessage & { type: 'step:complete' }) => void;
  'flow:complete': (message: ProgressMessage & { type: 'flow:complete' }) => void;
  error: (error: Error) => void;
  close: (code: number | null) => void;
}

/**
 * フローランナークラス
 *
 * CLIプロセスを起動し、進捗JSONメッセージを解析してイベントを発行する。
 * EventEmitterパターンを使用して、呼び出し側で進捗イベントを購読できる。
 *
 * @example
 * ```typescript
 * const runner = new FlowRunner('/path/to/flow.enbu.yaml');
 * runner.on('step:start', (message) => {
 *   console.log(`Step ${message.stepIndex} started`);
 * });
 * runner.on('step:complete', (message) => {
 *   console.log(`Step ${message.stepIndex} ${message.status}`);
 * });
 * await runner.run();
 * ```
 */
export class FlowRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private readonly filePath: string;

  /**
   * コンストラクタ
   *
   * @param filePath - 実行するフローファイルのパス
   */
  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  /**
   * フローを実行する
   *
   * CLIプロセスを起動し、進捗JSONを解析してイベントを発行する。
   * プロセスが終了するまで待機する。
   *
   * @returns プロセスの終了コード（成功時は0）
   */
  public run(): Promise<number> {
    return new Promise((resolve, reject) => {
      // CLIプロセスを起動
      // ワークスペースのnode_modules/.bin/enbuを使用（npxはキャッシュ問題があるため）
      // node_modules/.bin/enbuが見つからない場合はnpx --no経由で実行
      this.process = spawn('npx', ['--no', 'enbu', 'run', this.filePath, '--progress-json', '--headed'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // stdoutを行単位でバッファリング
      let stdoutBuffer = '';
      this.process.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();

        // 改行で分割してJSON行を処理
        const lines = stdoutBuffer.split('\n');
        // 最後の要素は不完全な行の可能性があるため、次回に持ち越す
        stdoutBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim() === '') {
            continue;
          }
          this.parseAndEmitJsonLine(line);
        }
      });

      // stderrはエラーとして処理
      this.process.stderr?.on('data', (data: Buffer) => {
        const errorMessage = data.toString();
        this.emit('error', new Error(`CLI Error: ${errorMessage}`));
      });

      // プロセス終了時
      this.process.on('close', (code) => {
        // 最後に残ったバッファを処理
        if (stdoutBuffer.trim() !== '') {
          this.parseAndEmitJsonLine(stdoutBuffer);
        }

        this.emit('close', code);
        resolve(code ?? 0);
      });

      // プロセス起動エラー
      this.process.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  /**
   * JSON行を解析してイベントを発行する
   *
   * @param line - JSON文字列の行
   */
  private parseAndEmitJsonLine(line: string): void {
    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      return;
    }

    const parseResult = this.tryParseJson(trimmedLine);
    parseResult.match(
      (message) => {
        // メッセージタイプに応じてイベントを発行
        // super.emitを使用して型エラーを回避
        super.emit(message.type, message);
      },
      (error) => {
        // JSON解析エラーは警告として処理（CLIの通常出力が混ざる可能性があるため）
        // この行はJSON進捗メッセージではない可能性が高い
        console.warn('Failed to parse JSON line:', trimmedLine, error);
      },
    );
  }

  /**
   * オブジェクトがtype文字列フィールドを持つかチェックする型ガード
   *
   * @param value - チェック対象の値
   * @returns typeフィールドを持つ場合true
   */
  private hasTypeField(value: unknown): value is { type: unknown } {
    return typeof value === 'object' && value !== null && 'type' in value;
  }

  /**
   * typeフィールドの値がProgressMessageの有効な型かチェックする
   *
   * @param typeValue - チェック対象のtype値
   * @returns 有効なProgressMessageの型の場合true
   */
  private isValidMessageType(typeValue: unknown): boolean {
    return (
      typeValue === 'flow:start' ||
      typeValue === 'step:start' ||
      typeValue === 'step:complete' ||
      typeValue === 'flow:complete'
    );
  }

  /**
   * 値がProgressMessageかチェックする型ガード
   *
   * @param value - チェック対象の値
   * @returns ProgressMessageの場合true
   */
  private isProgressMessage(value: unknown): value is ProgressMessage {
    return this.hasTypeField(value) && this.isValidMessageType(value.type);
  }

  /**
   * JSON文字列を解析する（Result型でラップ）
   *
   * @param line - JSON文字列
   * @returns 成功時: ProgressMessage、失敗時: Error
   */
  private tryParseJson(line: string): {
    match: (ok: (m: ProgressMessage) => void, err: (e: Error) => void) => void;
  } {
    try {
      const parsed: unknown = JSON.parse(line);

      if (this.isProgressMessage(parsed)) {
        return {
          match: (ok) => ok(parsed),
        };
      }

      return {
        match: (_ok, err) => err(new Error('Invalid message format')),
      };
    } catch (error) {
      return {
        match: (_ok, err) => err(error instanceof Error ? error : new Error('Unknown parse error')),
      };
    }
  }

  /**
   * プロセスを強制終了する
   */
  public kill(): void {
    if (this.process) {
      this.process.kill();
    }
  }

  /**
   * 型安全なイベントリスナー登録
   */
  public on<K extends keyof FlowRunnerEvents>(event: K, listener: FlowRunnerEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * 型安全なイベントリスナー解除
   */
  public off<K extends keyof FlowRunnerEvents>(event: K, listener: FlowRunnerEvents[K]): this {
    return super.off(event, listener);
  }
}
