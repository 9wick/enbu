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

// デバッグログ用（stderrに出力してno-consoleルールを回避）
const DEBUG = process.env.DEBUG_FLOW === '1';
const debugLog = (msg: string, ...args: unknown[]) => {
  if (DEBUG) process.stderr.write(`[auto-wait] ${msg} ${args.map(String).join(' ')}\n`);
};

/**
 * autoWaitの結果
 * resolvedRef: agent-browserで使用可能な@ref形式のセレクタ
 */
export type AutoWaitResult = {
  resolvedRef: string;
};

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
 * @returns 成功時: 解決されたrefを含む結果、失敗時: AgentBrowserError
 */
export const autoWait = async (
  selector: string | undefined,
  context: ExecutionContext,
): Promise<Result<AutoWaitResult | undefined, AgentBrowserError>> => {
  debugLog(`autoWait start: selector=${selector}`);
  // セレクタがない場合はスキップ
  if (!selector) {
    debugLog('no selector, skipping');
    return ok(undefined);
  }

  const startTime = Date.now();
  const { autoWaitTimeoutMs, autoWaitIntervalMs, executeOptions } = context;
  debugLog(`timeout=${autoWaitTimeoutMs}ms, interval=${autoWaitIntervalMs}ms`);

  let pollCount = 0;
  // ポーリングループ
  while (true) {
    pollCount++;
    debugLog(`poll #${pollCount}: calling snapshot...`);
    // snapshot取得（全要素を対象とする。-iオプションはインタラクティブ要素のみになり、
    // assertVisibleなどで静的テキスト要素が見つからなくなるため使用しない）
    const commandResult = await executeCommand('snapshot', ['--json'], executeOptions);
    debugLog(`poll #${pollCount}: snapshot done, isOk=${commandResult.isOk()}`);

    const snapshotResult = commandResult.andThen(parseJsonOutput).andThen(parseSnapshotRefs);

    // snapshotのパース失敗は致命的エラー
    if (snapshotResult.isErr()) {
      debugLog(`poll #${pollCount}: parse error`, snapshotResult.error);
      return err(snapshotResult.error);
    }

    const refs = snapshotResult.value;
    debugLog(`poll #${pollCount}: refs count=${Object.keys(refs).length}`);

    // セレクタに一致する要素を検索
    const foundRefId = findMatchingRefId(selector, refs);
    if (foundRefId) {
      const resolvedRef = `@${foundRefId}`;
      debugLog(`poll #${pollCount}: element found! refId=${foundRefId}, resolvedRef=${resolvedRef}`);
      return ok({ resolvedRef });
    }

    // タイムアウトチェック
    const elapsed = Date.now() - startTime;
    debugLog(`poll #${pollCount}: not found, elapsed=${elapsed}ms`);
    if (elapsed >= autoWaitTimeoutMs) {
      debugLog(`poll #${pollCount}: TIMEOUT`);
      return err({
        type: 'timeout',
        command: 'auto-wait',
        args: [selector],
        timeoutMs: autoWaitTimeoutMs,
      });
    }

    // 次のポーリングまで待機
    debugLog(`poll #${pollCount}: sleeping ${autoWaitIntervalMs}ms...`);
    await sleep(autoWaitIntervalMs);
  }
};

/**
 * セレクタに一致する要素のrefIdを検索する
 *
 * 以下の2つの形式のセレクタをサポート:
 * 1. @e1のような参照ID形式: refsマップ内にキーとして存在するかチェック
 * 2. テキストまたはロール: refs内の要素のnameまたはroleとマッチするかチェック
 *
 * @param selector - 検索する要素のセレクタ
 * @param refs - snapshotコマンドから取得した要素参照のマップ
 * @returns マッチした要素のrefId（例: "e1"）、見つからない場合はundefined
 */
const findMatchingRefId = (selector: string, refs: SnapshotRefs): string | undefined => {
  // @e1 形式の参照IDの場合
  if (selector.startsWith('@')) {
    const refId = selector.slice(1);
    return refId in refs ? refId : undefined;
  }

  // テキストまたはロールでマッチング
  for (const [refId, ref] of Object.entries(refs)) {
    if (ref.name.includes(selector) || ref.role === selector || ref.name === selector) {
      return refId;
    }
  }
  return undefined;
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
