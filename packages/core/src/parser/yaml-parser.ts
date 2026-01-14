/**
 * YAMLパーサー
 *
 * YAML形式のフロー定義をパースし、型安全なFlowオブジェクトに変換する。
 */

import { Result, ok, err, fromThrowable } from 'neverthrow';
import * as yaml from 'yaml';
import type { Flow, FlowEnv, Command, ParseError } from '../types';
import { validateCommand } from './validators/command-validator';

/**
 * YAMLパースをResult型でラップ
 *
 * fromThrowableのスコープは最小限（yaml.parseAllDocumentsのみ）
 */
const safeYamlParse = fromThrowable(
  (text: string) => yaml.parseAllDocuments(text),
  (error): ParseError => {
    if (error instanceof yaml.YAMLParseError) {
      return {
        type: 'yaml_syntax_error' as const,
        message: error.message,
        line: error.linePos?.[0]?.line,
        column: error.linePos?.[0]?.col,
      };
    }
    return {
      type: 'yaml_syntax_error' as const,
      message: error instanceof Error ? error.message : 'Unknown YAML parse error',
    };
  },
);

/**
 * 値がRecord型かどうかを判定する型ガード
 *
 * @param value - 判定対象の値
 * @returns Record型の場合true
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * 値がenvセクションを含むオブジェクトかどうかを判定する型ガード
 *
 * @param value - 判定対象の値
 * @returns envセクションを持つオブジェクトの場合true
 */
const hasEnvSection = (value: unknown): value is { env: unknown } => {
  return typeof value === 'object' && value !== null && 'env' in value;
};

/**
 * envセクションから環境変数マップを構築する
 *
 * @param envSection - envセクションのオブジェクト
 * @returns 環境変数マップ
 */
const buildEnvMap = (envSection: Record<string, unknown>): Record<string, string> => {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(envSection)) {
    if (typeof value === 'string') {
      env[key] = value;
    } else if (value !== null && value !== undefined) {
      env[key] = String(value);
    }
  }
  return env;
};

/**
 * 最初のドキュメントからenv情報を抽出する
 *
 * @param documents - YAMLドキュメント配列
 * @returns env情報
 */
const extractEnvFromDocument = (documents: yaml.Document.Parsed[]): FlowEnv => {
  const envDoc = documents[0].toJSON();
  if (!hasEnvSection(envDoc)) {
    return {};
  }

  const envSection = envDoc.env;
  if (!isRecord(envSection)) {
    return {};
  }

  return buildEnvMap(envSection);
};

/**
 * 最後のドキュメントからコマンド配列を抽出する
 *
 * @param documents - YAMLドキュメント配列
 * @returns コマンド配列
 */
const extractCommandsFromDocument = (documents: yaml.Document.Parsed[]): unknown[] => {
  const commandsDoc = documents[documents.length - 1].toJSON();
  return Array.isArray(commandsDoc) ? commandsDoc : [];
};

/**
 * YAMLドキュメントの構文エラーをチェックする
 *
 * 各ドキュメントの errors 配列をチェックし、エラーがあれば yaml_syntax_error を返す。
 * yamlライブラリは構文エラーを throw せず、document.errors に格納する仕様のため、
 * この関数で明示的にチェックする必要がある。
 *
 * @param documents - YAMLドキュメント配列
 * @returns エラーがない場合: ok(documents)、エラーがある場合: err(ParseError)
 */
const checkDocumentErrors = (
  documents: yaml.Document.Parsed[],
): Result<yaml.Document.Parsed[], ParseError> => {
  for (const doc of documents) {
    if (doc.errors.length > 0) {
      const firstError = doc.errors[0];
      return err({
        type: 'yaml_syntax_error' as const,
        message: firstError.message,
        line: firstError.linePos?.[0]?.line,
        column: firstError.linePos?.[0]?.col,
      });
    }
  }
  return ok(documents);
};

/**
 * YAMLドキュメントからenvとコマンド配列を抽出する
 *
 * 純粋関数として実装。
 * - ドキュメントが1つの場合: コマンド配列のみ
 * - ドキュメントが2つ以上の場合: 最初がenv、最後がコマンド配列
 */
const extractEnvAndCommands = (
  documents: yaml.Document.Parsed[],
): { env: FlowEnv; commands: unknown[] } => {
  // ドキュメントが1つの場合: コマンド配列のみ
  if (documents.length === 1) {
    return {
      env: {},
      commands: extractCommandsFromDocument(documents),
    };
  }

  // ドキュメントが2つ以上の場合: 最初がenv、最後がコマンド配列
  return {
    env: extractEnvFromDocument(documents),
    commands: extractCommandsFromDocument(documents),
  };
};

/**
 * コマンド配列が空でないことを検証する
 *
 * @param commands - 検証対象のコマンド配列
 * @returns 成功時: コマンド配列、失敗時: ParseError
 */
const validateNonEmpty = (commands: unknown[]): Result<unknown[], ParseError> => {
  if (commands.length === 0) {
    return err({
      type: 'invalid_flow_structure' as const,
      message: 'Flow contains no commands',
      details: 'Expected at least one command in the command array',
    });
  }
  return ok(commands);
};

/**
 * 検証済みコマンド配列に新しいコマンドを追加する
 *
 * @param validated - 既に検証済みのコマンド配列
 * @param command - 検証対象のコマンド
 * @param index - コマンドのインデックス
 * @returns 成功時: 新しいコマンドが追加された配列、失敗時: ParseError
 */
const appendValidatedCommand = (
  validated: Command[],
  command: unknown,
  index: number,
): Result<Command[], ParseError> => {
  return validateCommand(command, index).map((cmd) => [...validated, cmd]);
};

/**
 * reduceアキュムレータとコマンドを受け取り、検証済みコマンド配列を返す
 *
 * @param acc - 累積されたResultオブジェクト
 * @param command - 検証対象のコマンド
 * @param index - コマンドのインデックス
 * @returns 成功時: 更新された検証済みコマンド配列、失敗時: ParseError
 */
const reduceValidateCommand = (
  acc: Result<Command[], ParseError>,
  command: unknown,
  index: number,
): Result<Command[], ParseError> => {
  return acc.andThen((validated) => appendValidatedCommand(validated, command, index));
};

/**
 * コマンド配列全体を検証する
 *
 * reduceを使用して各コマンドを検証し、型安全なCommand配列に変換。
 * 最初のエラーで処理を停止する。
 *
 * @param cmds - 検証対象のコマンド配列
 * @returns 成功時: 検証済みCommand配列、失敗時: ParseError
 */
const validateAllCommands = (cmds: unknown[]): Result<Command[], ParseError> => {
  return cmds.reduce<Result<Command[], ParseError>>(reduceValidateCommand, ok([]));
};

/**
 * コマンド配列を検証する
 *
 * 各コマンドをバリデーションし、型安全なCommand配列に変換。
 * 最初のエラーで処理を停止する。
 */
const validateCommands = (commands: unknown[]): Result<readonly Command[], ParseError> => {
  return validateNonEmpty(commands).andThen(validateAllCommands);
};

/**
 * YAMLファイルをパースしてFlowオブジェクトに変換する
 *
 * @param yamlContent - YAMLファイルの内容
 * @param fileName - ファイル名（フロー名として使用）
 * @returns 成功時: Flowオブジェクト、失敗時: ParseError
 *
 * @remarks
 * - YAMLは `---` 区切りで複数ドキュメントに対応
 * - 最初のドキュメントは env セクション（オプション）
 * - 最後のドキュメントはコマンド配列
 * - コマンドは型検証され、不正な形式はエラーとなる
 *
 * @example
 * const yamlContent = `
 * env:
 *   BASE_URL: https://example.com
 * ---
 * - open: \${BASE_URL}
 * - click: "ログイン"
 * `;
 *
 * const result = parseFlowYaml(yamlContent, 'login.flow.yaml');
 * result.match(
 *   (flow) => console.log(flow.steps),
 *   (error) => console.error(error)
 * );
 */
export const parseFlowYaml = (yamlContent: string, fileName: string): Result<Flow, ParseError> => {
  // 1. YAMLをパース
  return (
    safeYamlParse(yamlContent)
      // 2. ドキュメントの構文エラーをチェック
      .andThen(checkDocumentErrors)
      .andThen((documents) => {
        // 3. ドキュメント数の確認
        if (documents.length === 0) {
          return err({
            type: 'invalid_flow_structure' as const,
            message: 'YAML contains no documents',
            details: 'Expected at least one document with command array',
          });
        }

        // 4. envセクションとコマンド配列を抽出
        const { env, commands } = extractEnvAndCommands(documents);

        // 5. コマンド配列の検証
        return validateCommands(commands).map((validatedCommands) => {
          // 6. フロー名をファイル名から生成（拡張子を除去）
          const name = fileName.replace(/\.flow\.yaml$/, '');

          return {
            name,
            env,
            steps: validatedCommands,
          };
        });
      })
  );
};
