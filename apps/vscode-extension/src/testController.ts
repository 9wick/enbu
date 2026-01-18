/**
 * Enbu Test Controller
 *
 * VSCode Test APIを使用してenbu.yamlフローをテストとして管理する。
 * ファイル単位で実行可能で、各ステップの進捗をリアルタイムで表示する。
 */

import * as vscode from 'vscode';
import { getStepLineNumbers } from '@packages/core';
import { FlowRunner } from './flowRunner';
import type { StepStartMessage, StepCompleteMessage, FlowCompleteMessage } from './types';

/**
 * ファイルTestItemに紐づくステップTestItemの配列を保持するWeakMap
 */
const fileStepItems = new WeakMap<vscode.TestItem, vscode.TestItem[]>();

/**
 * Enbu Test Controllerを作成する
 *
 * @param context - 拡張機能コンテキスト
 * @returns TestController
 */
export const createEnbuTestController = (
  context: vscode.ExtensionContext,
): vscode.TestController => {
  const controller = vscode.tests.createTestController('enbuTestController', 'Enbu Flow Tests');
  context.subscriptions.push(controller);

  // ファイル監視を設定
  setupFileWatcher(controller, context);

  // 既存の.enbu.yamlファイルを検出
  discoverExistingTests(controller);

  // 実行プロファイルを作成（ファイル単位でのみ実行可能）
  const runProfile = controller.createRunProfile(
    'Run Flow',
    vscode.TestRunProfileKind.Run,
    (request, token) => runHandler(controller, request, token),
    true, // デフォルトプロファイル
  );
  context.subscriptions.push(runProfile);

  return controller;
};

/**
 * ファイル監視を設定する
 *
 * .enbu.yamlファイルの作成・変更・削除を監視してTestItemを更新する。
 *
 * @param controller - TestController
 * @param context - 拡張機能コンテキスト
 */
const setupFileWatcher = (
  controller: vscode.TestController,
  context: vscode.ExtensionContext,
): void => {
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.enbu.yaml');

  watcher.onDidCreate((uri) => {
    addTestItem(controller, uri);
  });

  watcher.onDidChange((uri) => {
    // ファイルが変更されたらTestItemを更新
    const existingItem = controller.items.get(uri.toString());
    if (existingItem) {
      updateTestItemSteps(controller, existingItem, uri);
    }
  });

  watcher.onDidDelete((uri) => {
    controller.items.delete(uri.toString());
  });

  context.subscriptions.push(watcher);
};

/**
 * 既存の.enbu.yamlファイルを検出してTestItemを追加する
 *
 * @param controller - TestController
 */
const discoverExistingTests = async (controller: vscode.TestController): Promise<void> => {
  const files = await vscode.workspace.findFiles('**/*.enbu.yaml');
  for (const file of files) {
    addTestItem(controller, file);
  }
};

/**
 * ファイルに対応するTestItemを追加する
 *
 * @param controller - TestController
 * @param uri - ファイルURI
 */
const addTestItem = async (controller: vscode.TestController, uri: vscode.Uri): Promise<void> => {
  const relativePath = vscode.workspace.asRelativePath(uri);
  const testItem = controller.createTestItem(uri.toString(), relativePath, uri);

  // ファイルTestItemを追加
  controller.items.add(testItem);

  // ステップを子TestItemとして追加
  await updateTestItemSteps(controller, testItem, uri);
};

/**
 * 空の数値配列を返す（型安全）
 *
 * @returns 空の数値配列
 */
const emptyNumberArray = (): number[] => [];

/**
 * TestItemの子ステップを更新する
 *
 * YAMLファイルを解析して各ステップを子TestItemとして追加する。
 *
 * @param controller - TestController
 * @param fileItem - ファイルのTestItem
 * @param uri - ファイルURI
 */
const updateTestItemSteps = async (
  controller: vscode.TestController,
  fileItem: vscode.TestItem,
  uri: vscode.Uri,
): Promise<void> => {
  // 既存の子を削除
  fileItem.children.replace([]);

  const document = await vscode.workspace.openTextDocument(uri);
  const yamlContent = document.getText();

  // YAMLからステップの行番号を取得
  const lineNumbersResult = getStepLineNumbers(yamlContent);
  const lineNumbers = lineNumbersResult.match((nums: number[]) => nums, emptyNumberArray);

  const stepItems: vscode.TestItem[] = [];

  for (let i = 0; i < lineNumbers.length; i++) {
    const lineNumber = lineNumbers[i];
    if (lineNumber === undefined) {
      continue;
    }

    // ステップの行からラベルを取得
    const line = document.lineAt(lineNumber - 1); // 1始まり → 0始まり
    const stepLabel = extractStepLabel(line.text, i);

    const stepItem = controller.createTestItem(`${uri.toString()}#step${i}`, stepLabel, uri);

    // VSCodeの行番号は0始まり
    stepItem.range = new vscode.Range(lineNumber - 1, 0, lineNumber - 1, line.text.length);

    fileItem.children.add(stepItem);
    stepItems.push(stepItem);
  }

  // ステップアイテムをWeakMapに保存
  fileStepItems.set(fileItem, stepItems);
};

/**
 * YAML行からステップのラベルを抽出する
 *
 * @param lineText - 行のテキスト
 * @param index - ステップインデックス
 * @returns ステップのラベル
 */
const extractStepLabel = (lineText: string, index: number): string => {
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
 *
 * @param include - 実行対象として指定されたTestItem配列
 * @returns 実行対象のファイルTestItem配列
 */
const collectItemsFromInclude = (include: readonly vscode.TestItem[]): vscode.TestItem[] => {
  const itemsToRun: vscode.TestItem[] = [];

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
const collectAllItems = (controller: vscode.TestController): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [];
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
 */
const filterExcludedItems = (
  items: vscode.TestItem[],
  exclude: readonly vscode.TestItem[] | undefined,
): vscode.TestItem[] => {
  if (!exclude) {
    return items;
  }

  return items.filter((item) => !exclude.some((excluded) => excluded.id === item.id));
};

/**
 * テスト実行ハンドラ
 *
 * 選択されたTestItem（ファイル）を実行し、各ステップの進捗を更新する。
 *
 * @param controller - TestController
 * @param request - テスト実行リクエスト
 * @param token - キャンセルトークン
 */
const runHandler = async (
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
): Promise<void> => {
  const run = controller.createTestRun(request);

  // 実行対象のTestItemを取得
  const itemsToRun = request.include
    ? collectItemsFromInclude(request.include)
    : collectAllItems(controller);

  // 除外されたアイテムをフィルタ
  const filteredItems = filterExcludedItems(itemsToRun, request.exclude);

  // 各ファイルを順番に実行
  for (const fileItem of filteredItems) {
    if (token.isCancellationRequested) {
      break;
    }
    await runFlowTest(run, fileItem, token);
  }

  run.end();
};

/**
 * ステップ開始イベントを処理する
 *
 * @param run - TestRun
 * @param stepItems - ステップTestItem配列
 * @param message - ステップ開始メッセージ
 */
const handleStepStart = (
  run: vscode.TestRun,
  stepItems: vscode.TestItem[],
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
 */
const handleStepComplete = (
  run: vscode.TestRun,
  stepItems: vscode.TestItem[],
  message: StepCompleteMessage,
): void => {
  const stepItem = stepItems[message.stepIndex];
  if (!stepItem) {
    return;
  }

  if (message.status === 'passed') {
    run.passed(stepItem, message.duration);
    return;
  }

  const testMessage = new vscode.TestMessage(message.error ?? 'ステップが失敗しました');
  if (stepItem.uri && stepItem.range) {
    testMessage.location = new vscode.Location(stepItem.uri, stepItem.range);
  }
  run.failed(stepItem, testMessage, message.duration);
};

/**
 * フロー完了イベントを処理する
 *
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param message - フロー完了メッセージ
 */
const handleFlowComplete = (
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  message: FlowCompleteMessage,
): void => {
  if (message.status === 'passed') {
    run.passed(fileItem, message.duration);
  } else {
    run.failed(fileItem, new vscode.TestMessage('フローが失敗しました'), message.duration);
  }
};

/**
 * FlowRunnerにイベントリスナーを設定する
 *
 * @param runner - FlowRunner
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param stepItems - ステップTestItem配列
 */
const setupRunnerEventListeners = (
  runner: FlowRunner,
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  stepItems: vscode.TestItem[],
): void => {
  runner.on('step:start', (message: StepStartMessage) => {
    handleStepStart(run, stepItems, message);
  });

  runner.on('step:complete', (message: StepCompleteMessage) => {
    handleStepComplete(run, stepItems, message);
  });

  runner.on('flow:complete', (message: FlowCompleteMessage) => {
    handleFlowComplete(run, fileItem, message);
  });

  runner.on('error', (error: Error) => {
    run.errored(fileItem, new vscode.TestMessage(error.message));
  });
};

/**
 * キャンセル時の処理を行う
 *
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param stepItems - ステップTestItem配列
 */
const handleCancellation = (
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  stepItems: vscode.TestItem[],
): void => {
  run.skipped(fileItem);
  for (const stepItem of stepItems) {
    run.skipped(stepItem);
  }
};

/**
 * フロー実行に必要なパラメータを検証して取得する
 *
 * @param fileItem - ファイルTestItem
 * @returns 検証結果（成功時はパラメータ、失敗時はエラーメッセージ）
 */
const validateFlowTestParams = (
  fileItem: vscode.TestItem,
): { ok: true; filePath: string; workspaceRoot: string } | { ok: false; error: string } => {
  if (!fileItem.uri) {
    return { ok: false, error: 'skip' };
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileItem.uri);
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
 * FlowRunnerを実行してPromiseを返す
 *
 * @param runner - FlowRunner
 * @param token - キャンセルトークン
 * @returns 実行結果
 */
const executeFlowRunner = async (
  runner: FlowRunner,
  token: vscode.CancellationToken,
): Promise<{ cancelled: boolean }> => {
  const cancelListener = token.onCancellationRequested(() => {
    runner.kill();
  });

  try {
    await runner.run();
    return { cancelled: token.isCancellationRequested };
  } finally {
    cancelListener.dispose();
  }
};

/**
 * 検証失敗時の処理を行う
 *
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param error - エラーメッセージ
 */
const handleValidationError = (
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  error: string,
): void => {
  if (error === 'skip') {
    run.skipped(fileItem);
  } else {
    run.errored(fileItem, new vscode.TestMessage(error));
  }
};

/**
 * ステップをenqueued状態に設定する
 *
 * @param run - TestRun
 * @param stepItems - ステップTestItem配列
 */
const enqueueSteps = (run: vscode.TestRun, stepItems: vscode.TestItem[]): void => {
  for (const stepItem of stepItems) {
    run.enqueued(stepItem);
  }
};

/**
 * 単一のフローテストを実行する
 *
 * @param run - TestRun
 * @param fileItem - ファイルのTestItem
 * @param token - キャンセルトークン
 */
const runFlowTest = async (
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  token: vscode.CancellationToken,
): Promise<void> => {
  const params = validateFlowTestParams(fileItem);

  if (!params.ok) {
    handleValidationError(run, fileItem, params.error);
    return;
  }

  const stepItems = fileStepItems.get(fileItem) ?? [];

  run.started(fileItem);
  enqueueSteps(run, stepItems);

  const runner = new FlowRunner(params.filePath, params.workspaceRoot);
  setupRunnerEventListeners(runner, run, fileItem, stepItems);

  try {
    const result = await executeFlowRunner(runner, token);
    if (result.cancelled) {
      handleCancellation(run, fileItem, stepItems);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    run.errored(fileItem, new vscode.TestMessage(message));
  }
};
