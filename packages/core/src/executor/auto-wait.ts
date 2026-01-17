/**
 * 自動待機ロジック
 *
 * このモジュールはブラウザ内の要素が利用可能になるまで自動的に待機する機能を提供する。
 * click、type、fillなどのインタラクティブなコマンドの実行前に自動的に呼び出され、
 * 要素が見つかるまでポーリングを行う。
 */

import { Result, ok, err } from 'neverthrow';
import {
  executeCommand,
  parseJsonOutput,
  parseSnapshotRefs,
} from '@packages/agent-browser-adapter';
import type { AgentBrowserError, SnapshotRefs } from '@packages/agent-browser-adapter';
import type { ExecutionContext } from './result';

/**
 * 要素の出現を待機する
 *
 * セレクタに一致する要素がブラウザ内に出現するまで、指定された間隔でポーリングを行う。
 * タイムアウト時間内に要素が見つからない場合はエラーを返す。
 *
 * セレクタがundefinedの場合は待機をスキップする（待機不要なコマンドの場合）。
 *
 * @param selector - 待機する要素のセレクタ（@e1形式の参照ID、またはテキスト/ロール名）
 * @param context - 実行コンテキスト（タイムアウト時間、ポーリング間隔などを含む）
 * @returns 成功時: 要素が見つかった旨のメッセージ、失敗時: AgentBrowserError
 */
export const autoWait = async (
  selector: string | undefined,
  context: ExecutionContext,
): Promise<Result<string, AgentBrowserError>> => {
  // セレクタがない場合はスキップ
  if (!selector) {
    return ok('No selector to wait for');
  }

  const startTime = Date.now();
  const { autoWaitTimeoutMs, autoWaitIntervalMs, executeOptions } = context;

  // ポーリングループ
  while (true) {
    // snapshot取得
    const commandResult = await executeCommand('snapshot', ['--json', '-i'], executeOptions);

    const snapshotResult = commandResult.andThen(parseJsonOutput).andThen(parseSnapshotRefs);

    // snapshotのパース失敗は致命的エラー
    if (snapshotResult.isErr()) {
      return err(snapshotResult.error);
    }

    const refs = snapshotResult.value;

    // セレクタに一致する要素を検索
    if (isElementFound(selector, refs)) {
      return ok(`Element "${selector}" found`);
    }

    // タイムアウトチェック
    const elapsed = Date.now() - startTime;
    if (elapsed >= autoWaitTimeoutMs) {
      return err({
        type: 'timeout',
        command: 'auto-wait',
        args: [selector],
        timeoutMs: autoWaitTimeoutMs,
      });
    }

    // 次のポーリングまで待機
    await sleep(autoWaitIntervalMs);
  }
};

/**
 * セレクタに一致する要素が見つかったか判定
 *
 * 以下の2つの形式のセレクタをサポート:
 * 1. @e1のような参照ID形式: refsマップ内にキーとして存在するかチェック
 * 2. テキストまたはロール: refs内の要素のnameまたはroleとマッチするかチェック
 *
 * @param selector - 検索する要素のセレクタ
 * @param refs - snapshotコマンドから取得した要素参照のマップ
 * @returns 要素が見つかった場合はtrue、見つからない場合はfalse
 */
const isElementFound = (selector: string, refs: SnapshotRefs): boolean => {
  // @e1 形式の参照IDの場合
  if (selector.startsWith('@')) {
    const refId = selector.slice(1);
    return refId in refs;
  }

  // テキストまたはロールでマッチング
  return Object.values(refs).some(
    (ref) => ref.name.includes(selector) || ref.role === selector || ref.name === selector,
  );
};

/**
 * 指定ミリ秒待機
 *
 * ポーリング間隔を制御するための非同期待機関数。
 * Promiseベースのタイマーを使用し、指定されたミリ秒数だけ処理を一時停止する。
 *
 * @param ms - 待機するミリ秒数
 * @returns 待機が完了したら解決されるPromise
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
