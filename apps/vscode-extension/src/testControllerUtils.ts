/**
 * TestController用ユーティリティ関数
 *
 * テスト可能な純粋関数を提供する。
 * vscode固有の型への依存を最小化し、テスト容易性を確保する。
 */

import type { StepStartMessage, StepCompleteMessage, FlowCompleteMessage } from './types';

/**
 * TestItemの最小インターフェース
 *
 * vscode.TestItemの必要なプロパティのみを定義。
 * テスト用モックと互換性を持たせるため。
 */
interface TestItemLike {
  id: string;
  label: string;
  uri?: { fsPath: string };
  range?: unknown;
  parent?: TestItemLike;
}

/**
 * TestRunの最小インターフェース
 *
 * テスト用に最小限の型を定義。
 */
interface TestRunLike<T extends TestItemLike, M> {
  started: (item: T) => void;
  passed: (item: T, duration?: number) => void;
  failed: (item: T, message: M, duration?: number) => void;
  errored: (item: T, message: M) => void;
  skipped: (item: T) => void;
  enqueued: (item: T) => void;
}

/**
 * TestControllerの最小インターフェース
 */
interface TestControllerLike<T extends TestItemLike> {
  items: {
    forEach: (callback: (item: T) => void) => void;
  };
}

/**
 * WorkspaceFolderの最小インターフェース
 */
interface WorkspaceFolderLike {
  uri: { fsPath: string };
}

/**
 * YAML行からステップのラベルを抽出する
 *
 * @param lineText - 行のテキスト
 * @param index - ステップインデックス
 * @returns ステップのラベル
 *
 * @example
 * ```typescript
 * extractStepLabel('  - goto:', 0) // => 'Step 1: goto'
 * extractStepLabel('  - click:', 1) // => 'Step 2: click'
 * extractStepLabel('invalid', 0) // => 'Step 1'
 * ```
 */
export const extractStepLabel = (lineText: string, index: number): string => {
  // "- action:" のような形式からactionを抽出
  const match = lineText.match(/^\s*-\s*(\w+):/);
  if (match?.[1]) {
    return `Step ${index + 1}: ${match[1]}`;
  }
  return `Step ${index + 1}`;
};

/**
 * request.includeから実行対象のファイルTestItemを収集する
 *
 * ステップが選択された場合は親ファイルを実行対象とする。
 * 同じ親が重複して追加されないようにする。
 *
 * @param include - 実行対象として指定されたTestItem配列
 * @returns 実行対象のファイルTestItem配列
 *
 * @example
 * ```typescript
 * // fileItem (親) が選択された場合
 * collectItemsFromInclude([fileItem]) // => [fileItem]
 *
 * // stepItem (子) が選択された場合
 * collectItemsFromInclude([stepItem]) // => [stepItem.parent]
 *
 * // 同じファイルの複数ステップが選択された場合
 * collectItemsFromInclude([step1, step2]) // => [parent] (重複なし)
 * ```
 */
export const collectItemsFromInclude = <T extends TestItemLike>(
  include: readonly T[],
): TestItemLike[] => {
  const itemsToRun: TestItemLike[] = [];

  for (const item of include) {
    // ステップが選択された場合は親ファイルを実行
    if (item.parent) {
      const parentNotAdded = !itemsToRun.some((i) => i.id === item.parent?.id);
      if (parentNotAdded && item.parent) {
        itemsToRun.push(item.parent);
      }
    } else {
      itemsToRun.push(item);
    }
  }

  return itemsToRun;
};

/**
 * controller.itemsから全てのTestItemを収集する
 *
 * @param controller - TestController
 * @returns 全てのTestItem配列
 */
export const collectAllItems = <T extends TestItemLike>(controller: TestControllerLike<T>): T[] => {
  const items: T[] = [];
  controller.items.forEach((item) => {
    items.push(item);
  });
  return items;
};

/**
 * 除外リストに含まれないアイテムをフィルタする
 *
 * @param items - フィルタ対象のTestItem配列
 * @param exclude - 除外するTestItem配列（undefined可）
 * @returns フィルタ後のTestItem配列
 *
 * @example
 * ```typescript
 * // excludeがない場合は全て返す
 * filterExcludedItems([item1, item2], undefined) // => [item1, item2]
 *
 * // item1を除外
 * filterExcludedItems([item1, item2], [item1]) // => [item2]
 * ```
 */
export const filterExcludedItems = <T extends TestItemLike>(
  items: T[],
  exclude: readonly T[] | undefined,
): T[] => {
  if (!exclude) {
    return items;
  }

  return items.filter((item) => !exclude.some((excluded) => excluded.id === item.id));
};

/**
 * ステップ開始イベントを処理する
 *
 * @param run - TestRun
 * @param stepItems - ステップTestItem配列
 * @param message - ステップ開始メッセージ
 *
 * @example
 * ```typescript
 * // stepIndex: 0 のステップを開始
 * handleStepStart(run, [step0, step1], { type: 'step:start', stepIndex: 0, stepTotal: 2 })
 * // => run.started(step0) が呼ばれる
 * ```
 */
export const handleStepStart = <T extends TestItemLike, M>(
  run: TestRunLike<T, M>,
  stepItems: T[],
  message: StepStartMessage,
): void => {
  const stepItem = stepItems[message.stepIndex];
  if (stepItem) {
    run.started(stepItem);
  }
};

/**
 * ステップ完了イベントを処理する
 *
 * @param run - TestRun
 * @param stepItems - ステップTestItem配列
 * @param message - ステップ完了メッセージ
 * @param createTestMessage - TestMessage作成関数
 * @param createLocation - Location作成関数（省略可）
 *
 * @example
 * ```typescript
 * // 成功時
 * handleStepComplete(run, [step], { ..., status: 'passed', duration: 100 }, ...)
 * // => run.passed(step, 100) が呼ばれる
 *
 * // 失敗時
 * handleStepComplete(run, [step], { ..., status: 'failed', error: 'エラー' }, ...)
 * // => run.failed(step, message, ...) が呼ばれる
 * ```
 */
export const handleStepComplete = <T extends TestItemLike, M>(
  run: TestRunLike<T, M>,
  stepItems: T[],
  message: StepCompleteMessage,
  createTestMessage: (text: string) => M,
  setLocation?: (testMessage: M, uri: { fsPath: string }, range: unknown) => void,
): void => {
  const stepItem = stepItems[message.stepIndex];
  if (!stepItem) {
    return;
  }

  if (message.status === 'passed') {
    run.passed(stepItem, message.duration);
    return;
  }

  const testMessage = createTestMessage(message.error ?? 'ステップが失敗しました');
  if (setLocation && stepItem.uri && stepItem.range) {
    setLocation(testMessage, stepItem.uri, stepItem.range);
  }
  run.failed(stepItem, testMessage, message.duration);
};

/**
 * フロー完了イベントを処理する
 *
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param message - フロー完了メッセージ
 * @param createTestMessage - TestMessage作成関数
 *
 * @example
 * ```typescript
 * // 成功時
 * handleFlowComplete(run, fileItem, { ..., status: 'passed', duration: 1000 }, ...)
 * // => run.passed(fileItem, 1000) が呼ばれる
 *
 * // 失敗時
 * handleFlowComplete(run, fileItem, { ..., status: 'failed' }, ...)
 * // => run.failed(fileItem, message, ...) が呼ばれる
 * ```
 */
export const handleFlowComplete = <T extends TestItemLike, M>(
  run: TestRunLike<T, M>,
  fileItem: T,
  message: FlowCompleteMessage,
  createTestMessage: (text: string) => M,
): void => {
  if (message.status === 'passed') {
    run.passed(fileItem, message.duration);
  } else {
    run.failed(fileItem, createTestMessage('フローが失敗しました'), message.duration);
  }
};

/**
 * キャンセル時の処理を行う
 *
 * ファイルと全ステップをスキップ状態にする。
 *
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param stepItems - ステップTestItem配列
 */
export const handleCancellation = <T extends TestItemLike, M>(
  run: TestRunLike<T, M>,
  fileItem: T,
  stepItems: T[],
): void => {
  run.skipped(fileItem);
  for (const stepItem of stepItems) {
    run.skipped(stepItem);
  }
};

/**
 * フロー実行パラメータの検証結果型
 */
type ValidateFlowTestParamsResult =
  | { ok: true; filePath: string; workspaceRoot: string }
  | { ok: false; error: string };

/**
 * フロー実行に必要なパラメータを検証して取得する
 *
 * @param fileItem - ファイルTestItem
 * @param getWorkspaceFolder - ワークスペースフォルダ取得関数
 * @returns 検証結果（成功時はパラメータ、失敗時はエラーメッセージ）
 *
 * @example
 * ```typescript
 * // uriがない場合
 * validateFlowTestParams({ uri: undefined }, ...) // => { ok: false, error: 'skip' }
 *
 * // ワークスペースフォルダがない場合
 * validateFlowTestParams(item, () => undefined) // => { ok: false, error: 'ワークスペースフォルダが見つかりません' }
 *
 * // 正常時
 * validateFlowTestParams(item, () => folder) // => { ok: true, filePath: '...', workspaceRoot: '...' }
 * ```
 */
export const validateFlowTestParams = <T extends TestItemLike>(
  fileItem: T,
  getWorkspaceFolder: (uri: { fsPath: string }) => WorkspaceFolderLike | undefined,
): ValidateFlowTestParamsResult => {
  if (!fileItem.uri) {
    return { ok: false, error: 'skip' };
  }

  const workspaceFolder = getWorkspaceFolder(fileItem.uri);
  if (!workspaceFolder) {
    return { ok: false, error: 'ワークスペースフォルダが見つかりません' };
  }

  return {
    ok: true,
    filePath: fileItem.uri.fsPath,
    workspaceRoot: workspaceFolder.uri.fsPath,
  };
};

/**
 * 検証失敗時の処理を行う
 *
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param error - エラーメッセージ
 * @param createTestMessage - TestMessage作成関数
 */
export const handleValidationError = <T extends TestItemLike, M>(
  run: TestRunLike<T, M>,
  fileItem: T,
  error: string,
  createTestMessage: (text: string) => M,
): void => {
  if (error === 'skip') {
    run.skipped(fileItem);
  } else {
    run.errored(fileItem, createTestMessage(error));
  }
};

/**
 * ステップをenqueued状態に設定する
 *
 * @param run - TestRun
 * @param stepItems - ステップTestItem配列
 */
export const enqueueSteps = <T extends TestItemLike, M>(
  run: TestRunLike<T, M>,
  stepItems: T[],
): void => {
  for (const stepItem of stepItems) {
    run.enqueued(stepItem);
  }
};
