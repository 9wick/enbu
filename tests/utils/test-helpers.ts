import { spawn } from 'node:child_process';
import { Result, ok } from 'neverthrow';
import { join } from 'node:path';

/**
 * CLIの実行結果
 */
export type CliResult = {
  /** 終了コード */
  exitCode: number;
  /** 標準出力の内容 */
  stdout: string;
  /** 標準エラー出力の内容 */
  stderr: string;
};

/**
 * CLIを実行するヘルパー関数
 *
 * このヘルパー関数は統合テストおよびE2Eテストで使用するために、
 * 実際のCLIプロセスを起動し、その実行結果を取得します。
 * CLIのエントリーポイント（apps/cli/src/main.ts）を `tsx` または `node` で実行します。
 *
 * 実行が完了するまで待機し、標準出力・標準エラー出力・終了コードを返します。
 * 副作用として子プロセスの起動と終了を伴います。
 *
 * @param args - CLIに渡すコマンドライン引数の配列
 * @returns CLIの実行結果を含むPromise<Result>
 *
 * @example
 * ```typescript
 * // ヘルプを表示
 * const result = await runCli(['--help']);
 * console.log(result.value.stdout); // ヘルプメッセージが出力される
 *
 * // フローファイルを実行
 * const result2 = await runCli(['tests/fixtures/flows/simple.flow.yaml']);
 * console.log(result2.value.exitCode); // 0（成功）
 * ```
 */
export const runCli = async (args: string[]): Promise<Result<CliResult, never>> => {
  return new Promise((resolve) => {
    // CLIのエントリーポイントのパスを解決
    const cliEntryPoint = join(process.cwd(), 'apps', 'cli', 'src', 'main.ts');

    // tsxを使ってTypeScriptファイルを直接実行
    // 本番環境ではビルド済みのJSファイルを使用することを想定
    const proc = spawn('tsx', [cliEntryPoint, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    // 標準出力を収集
    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    // 標準エラー出力を収集
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // プロセス終了時に結果を返す
    proc.on('close', (exitCode: number | null) => {
      resolve(
        ok({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
        }),
      );
    });

    // プロセスエラー時も終了コード1として扱う
    proc.on('error', () => {
      resolve(
        ok({
          exitCode: 1,
          stdout,
          stderr: stderr || 'プロセスの起動に失敗しました',
        }),
      );
    });
  });
};
