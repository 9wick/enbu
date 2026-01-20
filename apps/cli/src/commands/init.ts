import { ResultAsync, okAsync } from 'neverthrow';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import type { CliError } from '../types';
import { OutputFormatter } from '../output/formatter';
import { fileExists, createDirectory, writeFileContent, readFileContent } from '../utils/fs';

/** 生成するディレクトリ */
const ENBUFLOW_DIR = '.enbuflow';

/** サンプルフローファイルの内容 */
const SAMPLE_FLOW_YAML = `# enbuのサンプルフロー
steps:
  - open: https://example.com
  - click: "More information..."
  - assertVisible: "Example Domain"
`;

/**
 * initコマンドを実行
 *
 * プロジェクトの初期化を行い、以下の処理を実行する:
 * 1. .enbuflow/ ディレクトリを作成
 * 2. サンプルフローファイル example.enbu.yaml を生成
 * 3. .gitignore への追記を対話的に提案
 *
 * forceフラグがtrueの場合、既存ファイルを上書きする。
 * forceフラグがfalseの場合、既存ファイルはスキップされる。
 *
 * @param args - initコマンドの引数
 * @param args.force - 既存ファイルを強制的に上書きするかどうか
 * @param args.verbose - 詳細なログ出力を行うかどうか
 * @returns 成功時: void、失敗時: CliError
 */
export const runInitCommand = (args: {
  force: boolean;
  verbose: boolean;
}): ResultAsync<void, CliError> => {
  const formatter = new OutputFormatter(args.verbose);

  formatter.info('Initializing enbu project...');

  // .enbuflow/ ディレクトリとサンプルファイルを作成
  return setupEnbuflowDirectory(args.force, formatter).andThen(() => {
    // .gitignore への追記を提案
    return ResultAsync.fromPromise(
      promptGitignoreUpdate(formatter),
      (error): CliError => ({
        type: 'execution_error' as const,
        message: 'Failed to prompt gitignore update',
        cause: error,
      }),
    ).map(() => {
      formatter.newline();
      formatter.info('Initialization complete!');
      formatter.info(`Try: npx enbu ${ENBUFLOW_DIR}/example.enbu.yaml`);
      return undefined;
    });
  });
};

/**
 * .enbuflow/ ディレクトリとサンプルファイルを作成
 *
 * .enbuflow/ ディレクトリを作成し、その中にサンプルフローファイルを生成する。
 * forceフラグがfalseで既存ファイルが存在する場合はスキップする。
 *
 * @param force - 既存ファイルを強制的に上書きするかどうか
 * @param formatter - 出力フォーマッター
 * @returns 成功時: void、失敗時: CliError
 */
const setupEnbuflowDirectory = (
  force: boolean,
  formatter: OutputFormatter,
): ResultAsync<void, CliError> => {
  // .enbuflow/ ディレクトリを作成
  const enbuflowPath = resolve(process.cwd(), ENBUFLOW_DIR);

  return ResultAsync.fromPromise(
    fileExists(enbuflowPath),
    (error): CliError => ({
      type: 'execution_error' as const,
      message: 'Failed to check if directory exists',
      cause: error,
    }),
  )
    .andThen((enbuflowExists) => {
      if (enbuflowExists && !force) {
        formatter.success(`Directory already exists: ${ENBUFLOW_DIR}`);
        return okAsync(undefined);
      }
      return createDirectory(enbuflowPath).map(() => {
        formatter.success(`Created ${ENBUFLOW_DIR}/ directory`);
        return undefined;
      });
    })
    .andThen(() => createExampleFlowIfNeeded(enbuflowPath, force, formatter));
};

/**
 * example.enbu.yaml を必要に応じて作成
 *
 * @param enbuflowPath - .enbuflow ディレクトリのパス
 * @param force - 強制上書きフラグ
 * @param formatter - 出力フォーマッター
 * @returns 成功時: void、失敗時: CliError
 */
const createExampleFlowIfNeeded = (
  enbuflowPath: string,
  force: boolean,
  formatter: OutputFormatter,
): ResultAsync<void, CliError> => {
  const exampleFlowPath = resolve(enbuflowPath, 'example.enbu.yaml');
  return ResultAsync.fromPromise(
    fileExists(exampleFlowPath),
    (error): CliError => ({
      type: 'execution_error' as const,
      message: 'Failed to check if file exists',
      cause: error,
    }),
  ).andThen((exampleFlowExists) => {
    if (exampleFlowExists && !force) {
      formatter.success(`File already exists: ${ENBUFLOW_DIR}/example.enbu.yaml`);
      return okAsync(undefined);
    }
    return writeFileContent(exampleFlowPath, SAMPLE_FLOW_YAML).map(() => {
      formatter.success(`Created ${ENBUFLOW_DIR}/example.enbu.yaml`);
      return undefined;
    });
  });
};

/**
 * .gitignore への追記を対話的に提案
 *
 * ユーザーに .gitignore への追記を提案し、了承された場合に .enbuflow/ を追記する。
 * .gitignore の更新に失敗した場合は、エラーメッセージと手動での追記方法を表示する。
 *
 * @param formatter - 出力フォーマッター
 */
const promptGitignoreUpdate = async (formatter: OutputFormatter): Promise<void> => {
  formatter.newline();
  const shouldUpdateGitignore = await askYesNo(
    'Would you like to add .enbuflow/ to .gitignore? (y/N): ',
  );

  if (shouldUpdateGitignore) {
    const gitignorePath = resolve(process.cwd(), '.gitignore');
    const updateResult = await updateGitignore(gitignorePath);

    updateResult.match(
      () => formatter.success('Updated .gitignore'),
      (error) => {
        formatter.error(`Failed to update .gitignore: ${error.message}`);
        formatter.indent('You can manually add ".enbuflow/" to your .gitignore file', 1);
      },
    );
  }
};

/**
 * Yes/No 質問を対話的に行う
 *
 * ユーザーに質問を表示し、標準入力から回答を受け取る。
 * 'y' または 'yes'（大文字小文字を区別しない）が入力された場合にtrueを返す。
 * それ以外の入力（空文字列を含む）の場合はfalseを返す。
 *
 * readlineのcreateInterfaceを使用して対話的な入力を実現している。
 * 入力完了後は必ずrl.close()を呼び出してリソースを解放する。
 *
 * @param question - ユーザーに表示する質問文
 * @returns ユーザーが 'y' または 'yes' を入力した場合はtrue、それ以外はfalse
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
 * .gitignore に .enbuflow/ を追記
 *
 * .gitignoreファイルに .enbuflow/ エントリを追加する。
 * 以下の条件に応じて処理が分岐する:
 *
 * 1. .gitignoreが存在しない場合:
 *    - 新規に.gitignoreファイルを作成し、.enbuflow/を記述する
 *
 * 2. .gitignoreが存在し、既に.enbuflow/が含まれている場合:
 *    - 何もせずに成功を返す（重複追記を防ぐ）
 *
 * 3. .gitignoreが存在し、.enbuflow/が含まれていない場合:
 *    - ファイル末尾に.enbuflow/を追記する
 *    - 元のファイルが改行で終わっていない場合は、改行を追加してから追記する
 *
 * @param path - .gitignoreファイルのパス
 * @returns 成功時: void、失敗時: CliError（type: 'execution_error'）
 */
/**
 * 既存の .gitignore にエントリを追記する
 *
 * @param path - .gitignoreファイルのパス
 * @param entry - 追記するエントリ
 * @returns 成功時: void、失敗時: CliError
 */
const appendToExistingGitignore = (path: string, entry: string): ResultAsync<void, CliError> =>
  readFileContent(path).andThen((content) => {
    // 既に .enbuflow/ が含まれている場合はスキップ
    if (content.includes(entry)) {
      return okAsync(undefined);
    }

    // 追記
    const newContent = content.endsWith('\n') ? `${content}${entry}\n` : `${content}\n${entry}\n`;
    return writeFileContent(path, newContent);
  });

const updateGitignore = (path: string): ResultAsync<void, CliError> => {
  const entry = '.enbuflow/';

  return ResultAsync.fromPromise(
    fileExists(path),
    (error): CliError => ({
      type: 'execution_error' as const,
      message: 'Failed to check if .gitignore exists',
      cause: error,
    }),
  ).andThen((exists) => {
    if (!exists) {
      // .gitignore が存在しない場合、新規作成
      return writeFileContent(path, `${entry}\n`);
    }

    // 既存の .gitignore を読み込んで追記
    return appendToExistingGitignore(path, entry);
  });
};
