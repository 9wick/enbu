import { type Result, ok } from 'neverthrow';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import type { CliError } from '../types';
import { OutputFormatter } from '../output/formatter';
import { fileExists, createDirectory, writeFileContent, readFileContent } from '../utils/fs';

/** 生成するディレクトリ */
const ABFLOW_DIR = '.abflow';

/** サンプルフローファイルの内容 */
const SAMPLE_FLOW_YAML = `# agent-browser-flowのサンプルフロー
steps:
  - open: https://example.com
  - click: "More information..."
  - assertVisible: "Example Domain"
`;

/**
 * initコマンドを実行
 *
 * プロジェクトの初期化を行い、以下の処理を実行する:
 * 1. .abflow/ ディレクトリを作成
 * 2. サンプルフローファイル example.flow.yaml を生成
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
export const runInitCommand = async (args: {
  force: boolean;
  verbose: boolean;
}): Promise<Result<void, CliError>> => {
  const formatter = new OutputFormatter(args.verbose);

  formatter.info('Initializing agent-browser-flow project...');

  // .abflow/ ディレクトリとサンプルファイルを作成
  const setupResult = await setupAbflowDirectory(args.force, formatter);
  if (setupResult.isErr()) {
    return setupResult;
  }

  // .gitignore への追記を提案
  await promptGitignoreUpdate(formatter);

  formatter.newline();
  formatter.info('Initialization complete!');
  formatter.info(`Try: npx agent-browser-flow ${ABFLOW_DIR}/example.flow.yaml`);

  return ok(undefined);
};

/**
 * .abflow/ ディレクトリとサンプルファイルを作成
 *
 * .abflow/ ディレクトリを作成し、その中にサンプルフローファイルを生成する。
 * forceフラグがfalseで既存ファイルが存在する場合はスキップする。
 *
 * @param force - 既存ファイルを強制的に上書きするかどうか
 * @param formatter - 出力フォーマッター
 * @returns 成功時: void、失敗時: CliError
 */
const setupAbflowDirectory = async (
  force: boolean,
  formatter: OutputFormatter,
): Promise<Result<void, CliError>> => {
  // .abflow/ ディレクトリを作成
  const abflowPath = resolve(process.cwd(), ABFLOW_DIR);
  const abflowExists = await fileExists(abflowPath);

  if (abflowExists && !force) {
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

  if (exampleFlowExists && !force) {
    formatter.success(`File already exists: ${ABFLOW_DIR}/example.flow.yaml`);
  } else {
    const writeResult = await writeFileContent(exampleFlowPath, SAMPLE_FLOW_YAML);
    if (writeResult.isErr()) {
      return writeResult;
    }
    formatter.success(`Created ${ABFLOW_DIR}/example.flow.yaml`);
  }

  return ok(undefined);
};

/**
 * .gitignore への追記を対話的に提案
 *
 * ユーザーに .gitignore への追記を提案し、了承された場合に .abflow/ を追記する。
 * .gitignore の更新に失敗した場合は、エラーメッセージと手動での追記方法を表示する。
 *
 * @param formatter - 出力フォーマッター
 */
const promptGitignoreUpdate = async (formatter: OutputFormatter): Promise<void> => {
  formatter.newline();
  const shouldUpdateGitignore = await askYesNo(
    'Would you like to add .abflow/ to .gitignore? (y/N): ',
  );

  if (shouldUpdateGitignore) {
    const gitignorePath = resolve(process.cwd(), '.gitignore');
    const updateResult = await updateGitignore(gitignorePath);

    updateResult.match(
      () => formatter.success('Updated .gitignore'),
      (error) => {
        formatter.error(`Failed to update .gitignore: ${error.message}`);
        formatter.indent('You can manually add ".abflow/" to your .gitignore file', 1);
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
 * .gitignore に .abflow/ を追記
 *
 * .gitignoreファイルに .abflow/ エントリを追加する。
 * 以下の条件に応じて処理が分岐する:
 *
 * 1. .gitignoreが存在しない場合:
 *    - 新規に.gitignoreファイルを作成し、.abflow/を記述する
 *
 * 2. .gitignoreが存在し、既に.abflow/が含まれている場合:
 *    - 何もせずに成功を返す（重複追記を防ぐ）
 *
 * 3. .gitignoreが存在し、.abflow/が含まれていない場合:
 *    - ファイル末尾に.abflow/を追記する
 *    - 元のファイルが改行で終わっていない場合は、改行を追加してから追記する
 *
 * @param path - .gitignoreファイルのパス
 * @returns 成功時: void、失敗時: CliError（type: 'execution_error'）
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
    return readResult.andThen(() => ok(undefined));
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
