import { parseArgs } from './args-parser';
import { runInitCommand } from './commands/init';
import { runFlowCommand } from './commands/run';
import { showHelp, showVersion, OutputFormatter } from './output/formatter';
import { EXIT_CODE, exitWithCode } from './output/exit-code';

/**
 * CLIエントリポイント
 *
 * コマンドライン引数をパースし、適切なコマンドを実行する。
 * 実行結果に基づいて終了コードを設定する。
 */
const main = async (): Promise<void> => {
  // 引数パース
  const argsResult = parseArgs(process.argv.slice(2));

  // neverthrowのmatchパターンで処理する
  await argsResult.match(
    async (args) => {
      // 引数のパースに成功した場合

      // バージョン表示
      if (args.version) {
        showVersion();
        exitWithCode(EXIT_CODE.SUCCESS);
      }

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
          },
        );
      } else {
        const formatter = new OutputFormatter(args.verbose);
        const result = await runFlowCommand(
          {
            files: args.files,
            headed: args.headed,
            env: args.env,
            timeout: args.timeout,
            screenshot: args.screenshot,
            bail: args.bail,
            session: args.session,
            verbose: args.verbose,
            progressJson: args.progressJson,
          },
          formatter,
        );

        result.match(
          (executionResult) => {
            const exitCode = executionResult.failed > 0 ? EXIT_CODE.FLOW_FAILED : EXIT_CODE.SUCCESS;
            exitWithCode(exitCode);
          },
          (error) => {
            process.stderr.write(`Error: ${error.message}\n`);
            exitWithCode(EXIT_CODE.EXECUTION_ERROR);
          },
        );
      }
    },
    (error) => {
      // 引数のパースに失敗した場合
      process.stderr.write(`Error: ${error.message}\n`);
      process.stderr.write('Try: npx enbu --help\n');
      exitWithCode(EXIT_CODE.EXECUTION_ERROR);
    },
  );
};

// エントリポイント実行
main();
