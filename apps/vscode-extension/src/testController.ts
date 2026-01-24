/**
 * Enbu Test Controller
 *
 * VSCode Test APIを使用してenbu.yamlフローをテストとして管理する。
 * ファイル単位で実行可能で、各ステップの進捗をリアルタイムで表示する。
 */

import * as vscode from 'vscode';
import { P, match } from 'ts-pattern';
import { getStepLineNumbers, generateSessionNameFromPath } from '@packages/core';
import { browserClose, type AgentBrowserError } from '@packages/agent-browser-adapter';
import { FlowRunner } from './flowRunner';
import type { StepStartMessage, StepCompleteMessage, FlowCompleteMessage } from './types';
import { StepHighlighter } from './stepHighlighter';
import {
  extractStepLabel,
  collectItemsFromInclude,
  collectAllItems,
  filterExcludedItems,
  handleStepStart,
  handleStepComplete,
  handleFlowComplete,
  handleCancellation,
  validateFlowTestParams,
  handleValidationError,
  enqueueSteps,
} from './testControllerUtils';

/**
 * ファイルTestItemに紐づくステップTestItemの配列を保持するWeakMap
 */
const fileStepItems = new WeakMap<vscode.TestItem, vscode.TestItem[]>();

/**
 * Enbu Test Controllerを作成する
 *
 * @param context - 拡張機能コンテキスト
 * @param stepHighlighter - ステップハイライター
 * @returns TestController
 */
export const createEnbuTestController = (
  context: vscode.ExtensionContext,
  stepHighlighter: StepHighlighter,
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
    (request, token) => runHandler(controller, request, token, stepHighlighter),
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
 * request.includeからVSCode TestItemを収集する
 *
 * collectItemsFromIncludeのVSCode固有ラッパー。
 * 親アイテムもvscode.TestItem型であることが実行時に保証されているため、
 * 型ガードでフィルタリングして正しい型を返す。
 *
 * @param include - 実行対象として指定されたTestItem配列
 * @returns 実行対象のファイルTestItem配列
 */
const collectVscodeItemsFromInclude = (include: readonly vscode.TestItem[]): vscode.TestItem[] => {
  const items = collectItemsFromInclude(include);
  // 実行時にはすべてvscode.TestItemであることが保証されている
  // idとlabelプロパティの存在で型ガードを行う
  return items.filter(
    (item): item is vscode.TestItem =>
      typeof item.id === 'string' && typeof item.label === 'string',
  );
};

/**
 * テスト実行ハンドラ
 *
 * 選択されたTestItem（ファイル）を並列実行し、各ステップの進捗を更新する。
 *
 * @param controller - TestController
 * @param request - テスト実行リクエスト
 * @param token - キャンセルトークン
 * @param stepHighlighter - ステップハイライター
 */
const runHandler = async (
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
  stepHighlighter: StepHighlighter,
): Promise<void> => {
  const run = controller.createTestRun(request);

  // 実行対象のTestItemを取得
  const itemsToRun = request.include
    ? collectVscodeItemsFromInclude(request.include)
    : collectAllItems(controller);

  // 除外されたアイテムをフィルタ
  const filteredItems = filterExcludedItems(itemsToRun, request.exclude);

  // 各ファイルを順番に実行（stepHighlighterが単一のデコレーションを管理するため）
  for (const fileItem of filteredItems) {
    if (token.isCancellationRequested) {
      break;
    }
    await runFlowTest(run, fileItem, token, stepHighlighter);
  }

  run.end();
};

/**
 * TestMessageを作成するヘルパー関数
 *
 * @param text - メッセージテキスト
 * @returns TestMessage
 */
const createTestMessage = (text: string): vscode.TestMessage => new vscode.TestMessage(text);

/**
 * rangeがvscode.Rangeかどうかを判定する型ガード
 *
 * ts-patternでstartとendプロパティの存在をチェックする。
 *
 * @param range - 判定対象
 * @returns vscode.Rangeの場合true
 */
const isVscodeRange = (range: unknown): range is vscode.Range =>
  match(range)
    .with({ start: P._, end: P._ }, () => true)
    .otherwise(() => false);

/**
 * TestMessageにLocationを設定するヘルパー関数
 *
 * @param message - TestMessage
 * @param uri - ファイルURI
 * @param range - 範囲
 */
const setMessageLocation = (
  message: vscode.TestMessage,
  uri: { fsPath: string },
  range: unknown,
): void => {
  if (!isVscodeRange(range)) {
    return;
  }
  message.location = new vscode.Location(vscode.Uri.file(uri.fsPath), range);
};

/**
 * FlowRunnerにイベントリスナーを設定する
 *
 * @param runner - FlowRunner
 * @param run - TestRun
 * @param fileItem - ファイルTestItem
 * @param stepItems - ステップTestItem配列
 * @param stepHighlighter - ステップハイライター
 */
const setupRunnerEventListeners = (
  runner: FlowRunner,
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  stepItems: vscode.TestItem[],
  stepHighlighter: StepHighlighter,
): void => {
  runner.on('step:start', (message: StepStartMessage) => {
    handleStepStart(run, stepItems, message);
    // ハイライト適用
    const stepItem = stepItems[message.stepIndex];
    if (stepItem) {
      stepHighlighter.highlightStep(stepItem);
    }
  });

  runner.on('step:complete', (message: StepCompleteMessage) => {
    handleStepComplete(run, stepItems, message, createTestMessage, setMessageLocation);
    // ハイライトクリア
    const stepItem = stepItems[message.stepIndex];
    if (stepItem) {
      stepHighlighter.clearStepHighlight(stepItem);
    }
  });

  runner.on('flow:complete', (message: FlowCompleteMessage) => {
    handleFlowComplete(run, fileItem, message, createTestMessage);

    // すべてのハイライトをクリア（念のため）
    stepHighlighter.clearAll();

    // フロー成功時のみセッションをクローズする
    // 失敗時はAIがデバッグできるようにセッションを残す
    if (message.status === 'passed' && fileItem.uri) {
      // セッション名はファイルパスから生成（coreと同じロジック）
      const sessionName = generateSessionNameFromPath(fileItem.uri.fsPath);
      // browserCloseは非同期だが、イベントハンドラーの処理をブロックしないため、
      // void-returning async関数を即座に実行する
      void (async () => {
        const closeResult = await browserClose(sessionName);
        closeResult.mapErr((error: AgentBrowserError) => {
          // セッションクローズ失敗はログのみ出力し、テストは失敗扱いにしない
          console.warn(`Failed to close session: ${error.type}`);
        });
      })();
    }
  });

  runner.on('error', (error: Error) => {
    run.errored(fileItem, createTestMessage(error.message));
    // エラー時はすべてのハイライトをクリア
    stepHighlighter.clearAll();
  });
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
 * ワークスペースフォルダを取得するヘルパー関数
 *
 * @param uri - ファイルURI
 * @returns ワークスペースフォルダ（見つからない場合はundefined）
 */
const getWorkspaceFolder = (uri: { fsPath: string }): { uri: { fsPath: string } } | undefined => {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(uri.fsPath));
  if (!folder) {
    return undefined;
  }
  return { uri: { fsPath: folder.uri.fsPath } };
};

/**
 * 単一のフローテストを実行する
 *
 * @param run - TestRun
 * @param fileItem - ファイルのTestItem
 * @param token - キャンセルトークン
 * @param stepHighlighter - ステップハイライター
 */
const runFlowTest = async (
  run: vscode.TestRun,
  fileItem: vscode.TestItem,
  token: vscode.CancellationToken,
  stepHighlighter: StepHighlighter,
): Promise<void> => {
  const params = validateFlowTestParams(fileItem, getWorkspaceFolder);

  if (!params.ok) {
    handleValidationError(run, fileItem, params.error, createTestMessage);
    return;
  }

  const stepItems = fileStepItems.get(fileItem) ?? [];

  run.started(fileItem);
  enqueueSteps(run, stepItems);

  const runner = new FlowRunner(params.filePath, params.workspaceRoot);
  setupRunnerEventListeners(runner, run, fileItem, stepItems, stepHighlighter);

  try {
    const result = await executeFlowRunner(runner, token);
    if (result.cancelled) {
      handleCancellation(run, fileItem, stepItems);
      // キャンセル時はすべてのハイライトをクリア
      stepHighlighter.clearAll();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    run.errored(fileItem, createTestMessage(message));
    // エラー時はすべてのハイライトをクリア
    stepHighlighter.clearAll();
  }
};
