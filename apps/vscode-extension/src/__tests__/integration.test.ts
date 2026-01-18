/**
 * VSCode拡張 統合テスト
 *
 * ユースケース: .enbu.yamlファイルを検出 → TestItem作成 → 実行 → ステップごとの結果表示
 *
 * このテストは以下のフローをE2E的に検証する:
 * 1. TestControllerがファイルを検出してTestItemを作成
 * 2. テスト実行を開始
 * 3. FlowRunnerからのイベントを受信
 * 4. TestRunに正しい結果が記録される
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  MockTestController,
  MockTestRun,
  MockCancellationToken,
  MockTextDocument,
  Uri,
  workspace,
  tests,
  createMockExtensionContext,
  type MockTestItem,
  type MockWorkspaceFolder,
} from '../__mocks__/vscode';

// FlowRunnerのモック
class MockFlowRunner extends EventEmitter {
  public readonly filePath: string;
  public readonly workspaceRoot: string;
  public runCalled = false;
  public killCalled = false;

  constructor(filePath: string, workspaceRoot: string) {
    super();
    this.filePath = filePath;
    this.workspaceRoot = workspaceRoot;
  }

  run(): Promise<number> {
    this.runCalled = true;
    return Promise.resolve(0);
  }

  kill(): void {
    this.killCalled = true;
  }
}

// FlowRunnerのモックインスタンスを保持
let mockFlowRunnerInstance: MockFlowRunner | null = null;

// FlowRunnerモジュールをモック
vi.mock('../flowRunner', () => ({
  FlowRunner: vi.fn().mockImplementation((filePath: string, workspaceRoot: string) => {
    mockFlowRunnerInstance = new MockFlowRunner(filePath, workspaceRoot);
    return mockFlowRunnerInstance;
  }),
}));

// createEnbuTestControllerをインポート（モック適用後）
import { createEnbuTestController } from '../testController';
import type { StepStartMessage, StepCompleteMessage, FlowCompleteMessage } from '../types';

describe('VSCode拡張 統合テスト', () => {
  // モックのリセット
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlowRunnerInstance = null;
  });

  describe('ユースケース: ファイル検出 → 実行 → 結果表示', () => {
    it('3ステップのフローを実行し、全ステップの成功を記録する', async () => {
      // === 準備 ===

      // YAMLファイルの内容（3ステップ）
      const yamlContent = `steps:
  - goto:
      url: https://example.com
  - click:
      selector: button
  - assert:
      selector: .result
`;

      // ファイルURI
      const fileUri = Uri.file('/workspace/test.enbu.yaml');

      // ワークスペースフォルダのモック
      const workspaceFolder: MockWorkspaceFolder = {
        uri: Uri.file('/workspace'),
        name: 'test-workspace',
        index: 0,
      };

      // VSCode APIのモック設定
      (workspace.findFiles as Mock).mockResolvedValue([fileUri]);
      (workspace.openTextDocument as Mock).mockResolvedValue(
        new MockTextDocument(fileUri, yamlContent),
      );
      (workspace.getWorkspaceFolder as Mock).mockReturnValue(workspaceFolder);
      (workspace.asRelativePath as Mock).mockReturnValue('test.enbu.yaml');

      // FileSystemWatcherのモック（イベントハンドラを保存）
      const watcherHandlers: {
        onCreate?: (uri: Uri) => void;
        onChange?: (uri: Uri) => void;
        onDelete?: (uri: Uri) => void;
      } = {};

      (workspace.createFileSystemWatcher as Mock).mockReturnValue({
        onDidCreate: vi.fn((handler: (uri: Uri) => void) => {
          watcherHandlers.onCreate = handler;
          return { dispose: vi.fn() };
        }),
        onDidChange: vi.fn((handler: (uri: Uri) => void) => {
          watcherHandlers.onChange = handler;
          return { dispose: vi.fn() };
        }),
        onDidDelete: vi.fn((handler: (uri: Uri) => void) => {
          watcherHandlers.onDelete = handler;
          return { dispose: vi.fn() };
        }),
        dispose: vi.fn(),
      });

      // TestControllerのモックを設定
      let capturedController: MockTestController | null = null;
      let capturedRunHandler:
        | ((request: { include?: MockTestItem[] }, token: MockCancellationToken) => Promise<void>)
        | null = null;

      (tests.createTestController as Mock).mockImplementation((id: string, label: string) => {
        capturedController = new MockTestController(id, label);

        // createRunProfileをオーバーライドしてrunHandlerをキャプチャ
        const originalCreateRunProfile =
          capturedController.createRunProfile.bind(capturedController);
        capturedController.createRunProfile = (
          profileLabel: string,
          kind: number,
          runHandler: (
            request: { include?: MockTestItem[] },
            token: MockCancellationToken,
          ) => Promise<void>,
          isDefault?: boolean,
        ) => {
          capturedRunHandler = runHandler;
          // @ts-expect-error - runHandlerの型はテスト用に簡略化している
          return originalCreateRunProfile(profileLabel, kind, runHandler, isDefault);
        };

        // createTestRunをオーバーライドして新しいMockTestRunを作成
        capturedController.createTestRun = () => new MockTestRun();

        return capturedController;
      });

      // ExtensionContextのモック
      const mockContext = createMockExtensionContext();

      // === 実行: TestControllerを作成 ===
      // @ts-expect-error - テスト実行時はvscodeモジュールがモックに置き換えられる
      createEnbuTestController(mockContext);

      // 非同期処理を待機（ファイル検出）
      await new Promise((resolve) => setTimeout(resolve, 50));

      // === 検証: TestControllerが作成された ===
      expect(capturedController).not.toBeNull();
      expect(tests.createTestController).toHaveBeenCalledWith(
        'enbuTestController',
        'Enbu Flow Tests',
      );

      // === 検証: ファイルが検出されてTestItemが作成された ===
      const controller = capturedController!;
      expect(controller.items.size).toBe(1);

      // ファイルのTestItemを取得
      let fileItem: MockTestItem | undefined;
      controller.items.forEach((item) => {
        fileItem = item;
      });
      expect(fileItem).toBeDefined();
      expect(fileItem!.label).toBe('test.enbu.yaml');

      // ステップの子TestItemを確認（3ステップ）
      expect(fileItem!.children.size).toBe(3);

      // 各ステップのラベルを確認
      const stepLabels: string[] = [];
      fileItem!.children.forEach((step) => {
        stepLabels.push(step.label);
      });
      expect(stepLabels).toContain('Step 1: goto');
      expect(stepLabels).toContain('Step 2: click');
      expect(stepLabels).toContain('Step 3: assert');

      // === 実行: テストを実行 ===
      expect(capturedRunHandler).not.toBeNull();

      // テスト実行リクエスト
      const testRun = new MockTestRun();
      controller.createTestRun = () => testRun;

      const token = new MockCancellationToken();

      // runHandlerを実行（非同期）
      const runPromise = capturedRunHandler!({ include: [fileItem!] }, token);

      // FlowRunnerのrun()が解決される前にイベントを発行
      await new Promise((resolve) => setTimeout(resolve, 10));

      // === FlowRunnerからイベントを発行 ===
      expect(mockFlowRunnerInstance).not.toBeNull();
      const runner = mockFlowRunnerInstance!;

      // Step 1 開始
      runner.emit('step:start', {
        type: 'step:start',
        stepIndex: 0,
        stepTotal: 3,
      } satisfies StepStartMessage);

      // Step 1 完了（成功）
      runner.emit('step:complete', {
        type: 'step:complete',
        stepIndex: 0,
        stepTotal: 3,
        status: 'passed',
        duration: 100,
      } satisfies StepCompleteMessage);

      // Step 2 開始
      runner.emit('step:start', {
        type: 'step:start',
        stepIndex: 1,
        stepTotal: 3,
      } satisfies StepStartMessage);

      // Step 2 完了（成功）
      runner.emit('step:complete', {
        type: 'step:complete',
        stepIndex: 1,
        stepTotal: 3,
        status: 'passed',
        duration: 200,
      } satisfies StepCompleteMessage);

      // Step 3 開始
      runner.emit('step:start', {
        type: 'step:start',
        stepIndex: 2,
        stepTotal: 3,
      } satisfies StepStartMessage);

      // Step 3 完了（成功）
      runner.emit('step:complete', {
        type: 'step:complete',
        stepIndex: 2,
        stepTotal: 3,
        status: 'passed',
        duration: 150,
      } satisfies StepCompleteMessage);

      // フロー完了
      runner.emit('flow:complete', {
        type: 'flow:complete',
        flowName: 'test.enbu.yaml',
        status: 'passed',
        duration: 450,
      } satisfies FlowCompleteMessage);

      // runHandlerの完了を待機
      await runPromise;

      // === 検証: TestRunに正しい結果が記録された ===
      const records = testRun.records;

      // ファイルのstartedを確認
      const fileStarted = records.find((r) => r.type === 'started' && r.item.id === fileItem!.id);
      expect(fileStarted).toBeDefined();

      // ファイルのpassedを確認
      const filePassed = records.find((r) => r.type === 'passed' && r.item.id === fileItem!.id);
      expect(filePassed).toBeDefined();
      expect(filePassed!.duration).toBe(450);

      // 各ステップのstartedとpassedを確認
      const stepRecords = records.filter((r) => r.item.id !== fileItem!.id);

      // 3ステップ × (started + passed) + enqueued × 3 = 9件
      // enqueued(3) + started(3) + passed(3) = 9件
      const enqueuedRecords = stepRecords.filter((r) => r.type === 'enqueued');
      const startedRecords = stepRecords.filter((r) => r.type === 'started');
      const passedRecords = stepRecords.filter((r) => r.type === 'passed');

      expect(enqueuedRecords.length).toBe(3);
      expect(startedRecords.length).toBe(3);
      expect(passedRecords.length).toBe(3);

      // durationを確認
      expect(passedRecords.map((r) => r.duration).sort()).toEqual([100, 150, 200]);
    });

    it('ステップ失敗時にfailed状態が記録される', async () => {
      // === 準備 ===
      const yamlContent = `steps:
  - goto:
      url: https://example.com
  - click:
      selector: .not-found
`;

      const fileUri = Uri.file('/workspace/fail-test.enbu.yaml');
      const workspaceFolder: MockWorkspaceFolder = {
        uri: Uri.file('/workspace'),
        name: 'test-workspace',
        index: 0,
      };

      (workspace.findFiles as Mock).mockResolvedValue([fileUri]);
      (workspace.openTextDocument as Mock).mockResolvedValue(
        new MockTextDocument(fileUri, yamlContent),
      );
      (workspace.getWorkspaceFolder as Mock).mockReturnValue(workspaceFolder);
      (workspace.asRelativePath as Mock).mockReturnValue('fail-test.enbu.yaml');

      (workspace.createFileSystemWatcher as Mock).mockReturnValue({
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      });

      let capturedController: MockTestController | null = null;
      let capturedRunHandler:
        | ((request: { include?: MockTestItem[] }, token: MockCancellationToken) => Promise<void>)
        | null = null;

      (tests.createTestController as Mock).mockImplementation((id: string, label: string) => {
        capturedController = new MockTestController(id, label);
        const originalCreateRunProfile =
          capturedController.createRunProfile.bind(capturedController);
        capturedController.createRunProfile = (
          profileLabel: string,
          kind: number,
          runHandler: (
            request: { include?: MockTestItem[] },
            token: MockCancellationToken,
          ) => Promise<void>,
          isDefault?: boolean,
        ) => {
          capturedRunHandler = runHandler;
          // @ts-expect-error - runHandlerの型はテスト用に簡略化している
          return originalCreateRunProfile(profileLabel, kind, runHandler, isDefault);
        };
        capturedController.createTestRun = () => new MockTestRun();
        return capturedController;
      });

      const mockContext = createMockExtensionContext();

      // === 実行 ===
      // @ts-expect-error - テスト実行時はvscodeモジュールがモックに置き換えられる
      createEnbuTestController(mockContext);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const controller = capturedController!;
      let fileItem: MockTestItem | undefined;
      controller.items.forEach((item) => {
        fileItem = item;
      });

      const testRun = new MockTestRun();
      controller.createTestRun = () => testRun;

      const token = new MockCancellationToken();
      const runPromise = capturedRunHandler!({ include: [fileItem!] }, token);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const runner = mockFlowRunnerInstance!;

      // Step 1 成功
      runner.emit('step:start', { type: 'step:start', stepIndex: 0, stepTotal: 2 });
      runner.emit('step:complete', {
        type: 'step:complete',
        stepIndex: 0,
        stepTotal: 2,
        status: 'passed',
        duration: 100,
      });

      // Step 2 失敗
      runner.emit('step:start', { type: 'step:start', stepIndex: 1, stepTotal: 2 });
      runner.emit('step:complete', {
        type: 'step:complete',
        stepIndex: 1,
        stepTotal: 2,
        status: 'failed',
        duration: 50,
        error: 'Element .not-found not found',
      });

      // フロー失敗
      runner.emit('flow:complete', {
        type: 'flow:complete',
        flowName: 'fail-test.enbu.yaml',
        status: 'failed',
        duration: 150,
      } satisfies FlowCompleteMessage);

      await runPromise;

      // === 検証 ===
      const records = testRun.records;

      // ステップ2がfailedになっていることを確認
      const failedSteps = records.filter((r) => r.type === 'failed' && r.item.id !== fileItem!.id);
      expect(failedSteps.length).toBe(1);
      expect(failedSteps[0].message?.message).toBe('Element .not-found not found');

      // ファイル全体もfailedになっていることを確認
      const fileFailed = records.find((r) => r.type === 'failed' && r.item.id === fileItem!.id);
      expect(fileFailed).toBeDefined();
    });

    it('キャンセル時にskipped状態が記録される', async () => {
      // === 準備 ===
      const yamlContent = `steps:
  - goto:
      url: https://example.com
`;

      const fileUri = Uri.file('/workspace/cancel-test.enbu.yaml');
      const workspaceFolder: MockWorkspaceFolder = {
        uri: Uri.file('/workspace'),
        name: 'test-workspace',
        index: 0,
      };

      (workspace.findFiles as Mock).mockResolvedValue([fileUri]);
      (workspace.openTextDocument as Mock).mockResolvedValue(
        new MockTextDocument(fileUri, yamlContent),
      );
      (workspace.getWorkspaceFolder as Mock).mockReturnValue(workspaceFolder);
      (workspace.asRelativePath as Mock).mockReturnValue('cancel-test.enbu.yaml');

      (workspace.createFileSystemWatcher as Mock).mockReturnValue({
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
      });

      let capturedController: MockTestController | null = null;
      let capturedRunHandler:
        | ((request: { include?: MockTestItem[] }, token: MockCancellationToken) => Promise<void>)
        | null = null;

      (tests.createTestController as Mock).mockImplementation((id: string, label: string) => {
        capturedController = new MockTestController(id, label);
        const originalCreateRunProfile =
          capturedController.createRunProfile.bind(capturedController);
        capturedController.createRunProfile = (
          profileLabel: string,
          kind: number,
          runHandler: (
            request: { include?: MockTestItem[] },
            token: MockCancellationToken,
          ) => Promise<void>,
          isDefault?: boolean,
        ) => {
          capturedRunHandler = runHandler;
          // @ts-expect-error - runHandlerの型はテスト用に簡略化している
          return originalCreateRunProfile(profileLabel, kind, runHandler, isDefault);
        };
        capturedController.createTestRun = () => new MockTestRun();
        return capturedController;
      });

      const mockContext = createMockExtensionContext();

      // === 実行 ===
      // @ts-expect-error - テスト実行時はvscodeモジュールがモックに置き換えられる
      createEnbuTestController(mockContext);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const controller = capturedController!;
      let fileItem: MockTestItem | undefined;
      controller.items.forEach((item) => {
        fileItem = item;
      });

      const testRun = new MockTestRun();
      controller.createTestRun = () => testRun;

      const token = new MockCancellationToken();

      // FlowRunnerのrunが終わらないようにする（キャンセルをシミュレート）
      const originalRun = MockFlowRunner.prototype.run;
      MockFlowRunner.prototype.run = function () {
        this.runCalled = true;
        // キャンセルされるまで待機
        return new Promise((resolve) => {
          const checkCancel = setInterval(() => {
            if (token.isCancellationRequested) {
              clearInterval(checkCancel);
              resolve(0);
            }
          }, 10);
        });
      };

      const runPromise = capturedRunHandler!({ include: [fileItem!] }, token);

      await new Promise((resolve) => setTimeout(resolve, 20));

      // キャンセルを実行
      token.cancel();

      await runPromise;

      // 元に戻す
      MockFlowRunner.prototype.run = originalRun;

      // === 検証 ===
      const records = testRun.records;

      // ファイルがskippedになっていることを確認
      const fileSkipped = records.find((r) => r.type === 'skipped' && r.item.id === fileItem!.id);
      expect(fileSkipped).toBeDefined();

      // FlowRunnerのkillが呼ばれたことを確認
      expect(mockFlowRunnerInstance!.killCalled).toBe(true);
    });
  });
});
