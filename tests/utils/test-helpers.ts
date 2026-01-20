import { spawn } from 'node:child_process';
import { ResultAsync, okAsync } from 'neverthrow';
import { join } from 'node:path';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

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
 * @returns CLIの実行結果を含むResultAsync
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
export const runCli = (args: string[]): ResultAsync<CliResult, never> =>
  ResultAsync.fromSafePromise(
    new Promise<CliResult>((resolve) => {
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
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
        });
      });

      // プロセスエラー時も終了コード1として扱う
      proc.on('error', () => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: stderr || 'プロセスの起動に失敗しました',
        });
      });
    }),
  );

/**
 * テスト用の一時フローファイルを作成する
 *
 * フィクスチャファイルを読み込み、ポート番号を置換した一時ファイルを作成します。
 * テスト終了後は cleanup() を呼び出して一時ファイルを削除してください。
 *
 * @param fixturePath - フィクスチャファイルのパス
 * @param port - 置換するポート番号
 * @param placeholderPort - 置換対象のプレースホルダーポート番号（デフォルト: 0）
 * @returns 一時ファイルのパスとクリーンアップ関数
 *
 * @example
 * ```typescript
 * const { tempPath, cleanup } = await createTempFlowWithPort(
 *   'tests/fixtures/flows/simple.enbu.yaml',
 *   server.port
 * );
 * try {
 *   const result = await runCli([tempPath]);
 *   // テストロジック...
 * } finally {
 *   await cleanup();
 * }
 * ```
 */
export const createTempFlowWithPort = async (
  fixturePath: string,
  port: number,
  placeholderPort = 0,
): Promise<{ tempPath: string; cleanup: () => Promise<void> }> => {
  // フィクスチャファイルを読み込み
  const content = await readFile(fixturePath, 'utf-8');

  // プレースホルダーポートを実際のポートに置換
  // パターン: http://localhost:XXXX/ の XXXX 部分を置換
  const pattern =
    placeholderPort === 0
      ? /http:\/\/localhost:(\d+)/g
      : new RegExp(`http://localhost:${placeholderPort}`, 'g');
  const replacedContent = content.replace(pattern, `http://localhost:${port}`);

  // 一時ファイルを作成
  const tempPath = join(
    tmpdir(),
    `enbu-test-${Date.now()}-${Math.random().toString(36).slice(2)}.enbu.yaml`,
  );
  await writeFile(tempPath, replacedContent, 'utf-8');

  return {
    tempPath,
    cleanup: async () => {
      try {
        await unlink(tempPath);
      } catch {
        // ファイルが存在しない場合は無視
      }
    },
  };
};
