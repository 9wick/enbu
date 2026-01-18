/**
 * YAMLパーサー
 *
 * YAML形式のフロー定義をパースし、型安全なFlowオブジェクトに変換する。
 *
 * @remarks
 * 新しいYAML形式のみをサポート：
 * ```yaml
 * env:
 *   BASE_URL: http://localhost:3000
 * steps:
 *   - open: ${BASE_URL}
 *   - assertVisible: Welcome
 * ```
 *
 * - ルートはオブジェクト形式（`steps`キーは必須、`env`キーはオプション）
 * - 旧形式（配列形式や`---`区切り）はサポートしない
 */

import { Result, ok, err, fromThrowable } from 'neverthrow';
import * as yaml from 'yaml';
import type { Flow, FlowEnv, Command, ParseError } from '../types';
import { validateCommand } from './validators/command-validator';

/**
 * YAMLパースをResult型でラップ
 *
 * fromThrowableのスコープは最小限（yaml.parseのみ）
 *
 * @remarks
 * 新形式では単一ドキュメントのみをサポートするため、parseAllDocumentsではなくparseを使用
 */
const safeYamlParse = fromThrowable(
  (text: string) => yaml.parse(text),
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
 * ルートオブジェクトの構造を検証する
 *
 * @param root - パース済みのYAMLルートオブジェクト
 * @returns 成功時: ルートオブジェクト、失敗時: ParseError
 *
 * @remarks
 * - ルートが配列の場合: `invalid_flow_structure`エラー
 * - ルートがオブジェクトでない場合: `invalid_flow_structure`エラー
 * - `steps`キーがない場合: `invalid_flow_structure`エラー
 * - `steps`が配列でない場合: `invalid_flow_structure`エラー
 */
const validateRootStructure = (root: unknown): Result<Record<string, unknown>, ParseError> => {
  // ルートが配列の場合はエラー
  if (Array.isArray(root)) {
    return err({
      type: 'invalid_flow_structure' as const,
      message: "Flow must be an object with 'steps' key, not an array",
      details: 'Array format is no longer supported. Use object format with steps key.',
    });
  }

  // ルートがオブジェクトでない場合はエラー
  if (!isRecord(root)) {
    return err({
      type: 'invalid_flow_structure' as const,
      message: 'Flow must be an object',
      details: 'Root must be an object with steps key',
    });
  }

  // stepsキーがない場合はエラー
  if (!('steps' in root)) {
    return err({
      type: 'invalid_flow_structure' as const,
      message: "Missing required 'steps' key in flow",
      details: 'Flow object must have a steps key containing an array of commands',
    });
  }

  // stepsが配列でない場合はエラー
  if (!Array.isArray(root.steps)) {
    return err({
      type: 'invalid_flow_structure' as const,
      message: "'steps' must be an array",
      details: 'The steps key must contain an array of command objects',
    });
  }

  return ok(root);
};

/**
 * envセクションから環境変数マップを構築する
 *
 * @param envSection - envセクションのオブジェクト
 * @returns 環境変数マップ
 *
 * @remarks
 * - 全ての値を文字列に変換
 * - nullとundefinedは除外
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
 * ルートオブジェクトからenv情報を抽出する
 *
 * @param root - 検証済みのルートオブジェクト
 * @returns env情報
 *
 * @remarks
 * - envキーがない場合: 空のオブジェクトを返す
 * - envがオブジェクトでない場合: 空のオブジェクトを返す
 */
const extractEnvFromRoot = (root: Record<string, unknown>): FlowEnv => {
  if (!('env' in root)) {
    return {};
  }

  const envSection = root.env;
  if (!isRecord(envSection)) {
    return {};
  }

  return buildEnvMap(envSection);
};

/**
 * ルートオブジェクトからsteps配列を抽出する
 *
 * @param root - 検証済みのルートオブジェクト
 * @returns steps配列
 *
 * @remarks
 * validateRootStructureで既に配列であることは検証済み
 */
const extractStepsFromRoot = (root: Record<string, unknown>): unknown[] => {
  const steps: unknown[] = Array.isArray(root.steps) ? root.steps : [];
  return steps;
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
 * 新しいYAML形式のみをサポート：
 * - ルートはオブジェクト形式（`steps`キーは必須、`env`キーはオプション）
 * - 旧形式（配列形式や`---`区切り）はサポートしない
 * - コマンドは型検証され、不正な形式はエラーとなる
 *
 * @example
 * ```typescript
 * const yamlContent = `
 * env:
 *   BASE_URL: https://example.com
 * steps:
 *   - open: \${BASE_URL}
 *   - click: "ログイン"
 * `;
 *
 * const result = parseFlowYaml(yamlContent, 'login.enbu.yaml');
 * result.match(
 *   (flow) => console.log(flow.steps),
 *   (error) => console.error(error)
 * );
 * ```
 */
/**
 * YAMLコンテンツから行開始位置の配列を計算する
 *
 * @param content - YAMLコンテンツ
 * @returns 各行の開始オフセット（0始まり）の配列
 */
const calculateLineStarts = (content: string): number[] => {
  const lineStarts: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
};

/**
 * オフセットから行番号を計算する
 *
 * @param offset - 文字位置のオフセット
 * @param lineStarts - 各行の開始位置配列
 * @returns 1始まりの行番号
 */
const offsetToLineNumber = (offset: number, lineStarts: number[]): number => {
  for (let i = lineStarts.length - 1; i >= 0; i--) {
    if (lineStarts[i] <= offset) {
      return i + 1;
    }
  }
  return 1;
};

/**
 * stepsシーケンスノードから各ステップの行番号を抽出する
 *
 * @param stepsNode - YAMLのsteps配列ノード
 * @param lineStarts - 各行の開始位置配列
 * @returns 各ステップの行番号配列（1始まり）
 */
const extractLineNumbersFromSteps = (stepsNode: yaml.YAMLSeq, lineStarts: number[]): number[] => {
  const lineNumbers: number[] = [];
  for (const item of stepsNode.items) {
    if (yaml.isNode(item) && item.range) {
      const startOffset = item.range[0];
      lineNumbers.push(offsetToLineNumber(startOffset, lineStarts));
    }
  }
  return lineNumbers;
};

/**
 * YAMLドキュメントを安全にパースする
 */
const safeParseDocument = fromThrowable(
  (text: string) => yaml.parseDocument(text),
  (error): ParseError => ({
    type: 'yaml_syntax_error' as const,
    message: error instanceof Error ? error.message : 'Unknown YAML parse error',
  }),
);

/**
 * YAMLテキスト内の各ステップの行番号を取得する
 *
 * VS Code拡張などで、実行中のステップをハイライト表示するために使用する。
 * yaml.parseDocument()を使用してCST情報を保持し、
 * 各ステップの開始行番号を抽出する。
 *
 * @param yamlContent - YAMLファイルの内容
 * @returns 成功時: 各ステップの行番号配列（1始まり）、失敗時: ParseError
 *
 * @example
 * ```typescript
 * const yamlContent = `
 * steps:
 *   - open: https://example.com
 *   - click: button
 * `;
 * const result = getStepLineNumbers(yamlContent);
 * // result.value = [3, 4] (0始まりのインデックスに対応する1始まりの行番号)
 * ```
 */
export const getStepLineNumbers = (yamlContent: string): Result<number[], ParseError> => {
  return safeParseDocument(yamlContent).andThen((doc) => {
    const contents = doc.contents;
    if (!yaml.isMap(contents)) {
      return err({
        type: 'invalid_flow_structure' as const,
        message: 'Root must be an object',
        details: 'Expected object with steps key',
      });
    }

    const stepsNode = contents.get('steps', true);
    if (!yaml.isSeq(stepsNode)) {
      return err({
        type: 'invalid_flow_structure' as const,
        message: "'steps' must be an array",
        details: 'The steps key must contain an array of command objects',
      });
    }

    const lineStarts = calculateLineStarts(yamlContent);
    const lineNumbers = extractLineNumbersFromSteps(stepsNode, lineStarts);
    return ok(lineNumbers);
  });
};

export const parseFlowYaml = (yamlContent: string, fileName: string): Result<Flow, ParseError> => {
  // 1. YAMLをパース（単一ドキュメント）
  return (
    safeYamlParse(yamlContent)
      // 2. ルート構造を検証（オブジェクト形式、stepsキー必須）
      .andThen(validateRootStructure)
      .andThen((root) => {
        // 3. envセクションを抽出（オプション）
        const env = extractEnvFromRoot(root);

        // 4. steps配列を抽出
        const steps = extractStepsFromRoot(root);

        // 5. steps配列の検証
        return validateCommands(steps).map((validatedCommands) => {
          // 6. フロー名をファイル名から生成（拡張子を除去）
          const name = fileName.replace(/\.enbu\.yaml$/, '');

          return {
            name,
            env,
            steps: validatedCommands,
          };
        });
      })
  );
};
