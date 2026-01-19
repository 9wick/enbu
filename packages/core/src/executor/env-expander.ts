/**
 * 環境変数展開モジュール
 *
 * フロー内の文字列に含まれる ${VAR_NAME} 形式の環境変数を展開する。
 * 存在しない変数が見つかった場合はエラーを返す（fail fast原則に基づく）。
 */
import { type Result, ok, err } from 'neverthrow';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { Flow, Command } from '../types';

/**
 * フロー内の環境変数を展開する
 *
 * フローの全てのステップを走査し、コマンド内の文字列フィールドに含まれる
 * ${VAR_NAME} 形式の環境変数を展開する。
 * 未定義の環境変数が見つかった場合は、エラーを返す。
 *
 * @param flow - 環境変数を含む可能性のあるフロー定義
 * @param env - 環境変数の辞書（キー=変数名、値=変数値）
 * @returns 環境変数が展開されたフロー定義、または未定義変数エラー
 *
 * @example
 * ```typescript
 * const flow: Flow = {
 *   name: 'test',
 *   env: {},
 *   steps: [
 *     { command: 'open', url: '${BASE_URL}/login' },
 *     { command: 'fill', selector: 'メールアドレス', value: '${EMAIL}' }
 *   ]
 * };
 * const env = { BASE_URL: 'https://example.com', EMAIL: 'user@example.com' };
 * const result = expandEnvVars(flow, env);
 * // result.isOk() の場合:
 * //   result.value.steps[0].url は 'https://example.com/login'
 * //   result.value.steps[1].value は 'user@example.com'
 * // result.isErr() の場合:
 * //   result.error.type は 'validation_error'
 * //   result.error.message は '環境変数 ${UNDEFINED} が定義されていません'
 * ```
 */
export const expandEnvVars = (
  flow: Flow,
  env: Record<string, string>,
): Result<Flow, AgentBrowserError> => {
  const expandedSteps: Command[] = [];

  for (const command of flow.steps) {
    const result = expandCommandEnvVars(command, env);
    if (result.isErr()) {
      return err(result.error);
    }
    expandedSteps.push(result.value);
  }

  return ok({
    ...flow,
    steps: expandedSteps,
  });
};

/**
 * コマンド内の環境変数を展開する
 *
 * コマンドオブジェクトの全てのプロパティを走査し、
 * 文字列型のプロパティに含まれる環境変数を展開する。
 * 未定義の環境変数が見つかった場合は、エラーを返す。
 *
 * @param command - 環境変数を含む可能性のあるコマンド
 * @param env - 環境変数の辞書（キー=変数名、値=変数値）
 * @returns 環境変数が展開されたコマンド、または未定義変数エラー
 *
 * @remarks
 * ## 前提条件
 * この実装は、全てのCommand型（OpenCommand、ClickCommand等）がフラットな構造であることを前提とする。
 * すなわち、トップレベルのプロパティは基本型（string、number、boolean等）のみで構成され、
 * ネストされたオブジェクトや配列を含まないことを前提とする。
 *
 * ## 実装の詳細
 * Object.entriesを使用して動的に全プロパティを走査し、
 * 実行時に文字列プロパティを判定することで、
 * Command型のあらゆるバリエーションに対応する。
 *
 * ## 将来の拡張について
 * 将来的にネストされたオブジェクトや配列を含むCommand型が追加された場合、
 * この関数は再帰的な走査に対応する必要がある。
 * その際は、型アサーションを使用せず、Command型のバリアント毎に
 * 個別に処理する型安全な実装への変更を検討すること。
 */
const expandCommandEnvVars = (
  command: Command,
  env: Record<string, string>,
): Result<Command, AgentBrowserError> => {
  type AnyObject = Record<string, unknown>;
  const source: AnyObject = command;
  const expanded: AnyObject = { ...source };

  for (const [key, value] of Object.entries(expanded)) {
    if (typeof value === 'string') {
      const result = expandString(value, env);
      if (result.isErr()) {
        return err(result.error);
      }
      expanded[key] = result.value;
    }
  }

  // Command型は全てフラットな構造であることを前提とし、
  // 入力のcommandオブジェクトの構造を保持したまま文字列プロパティのみを変換するため、
  // コンパイル時の型安全性よりも実行時の動的な処理を優先する。
  // @ts-expect-error - 動的なプロパティ走査のため、コンパイル時の型チェックは不可能
  return ok(expanded);
};

/**
 * 文字列内の環境変数を展開する
 *
 * ${VAR_NAME} 形式の環境変数プレースホルダーを実際の値に置換する。
 * 未定義の環境変数が見つかった場合は、エラーを返す。
 *
 * @param str - 環境変数を含む可能性のある文字列
 * @param env - 環境変数の辞書（キー=変数名、値=変数値）
 * @returns 環境変数が展開された文字列、または未定義変数エラー
 *
 * @example
 * ```typescript
 * const str = 'Hello ${NAME}, welcome to ${SITE}!';
 * const env = { NAME: 'Alice', SITE: 'Example' };
 * const result = expandString(str, env);
 * // result.isOk() の場合: result.value は 'Hello Alice, welcome to Example!'
 * ```
 *
 * @example
 * ```typescript
 * // 存在しない変数はエラーになる
 * const str = 'Value: ${UNKNOWN}';
 * const env = {};
 * const result = expandString(str, env);
 * // result.isErr() の場合:
 * //   result.error.type は 'validation_error'
 * //   result.error.message は '環境変数 ${UNKNOWN} が定義されていません'
 * ```
 */
const expandString = (
  str: string,
  env: Record<string, string>,
): Result<string, AgentBrowserError> => {
  // 未定義の変数名を記録するための配列
  const undefinedVars: string[] = [];

  // まず全ての変数名を収集してチェック
  const varPattern = /\$\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = varPattern.exec(str)) !== null) {
    const varName = match[1];
    if (!(varName in env)) {
      undefinedVars.push(varName);
    }
  }

  // 未定義の変数が見つかった場合はエラーを返す
  if (undefinedVars.length > 0) {
    const varList = undefinedVars.map((v) => `\${${v}}`).join(', ');
    return err({
      type: 'command_execution_failed' as const,
      message: `環境変数 ${varList} が定義されていません`,
      command: 'env-expand',
      rawError: `Undefined variables: ${varList}`,
    });
  }

  // 全ての変数が定義されている場合のみ展開を実行
  const expanded = str.replace(/\$\{([^}]+)\}/g, (_, varName) => env[varName]);
  return ok(expanded);
};
