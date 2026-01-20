/**
 * VSCode拡張 E2Eテスト
 *
 * ユースケース: .enbu.yamlファイルを検出 → TestItem作成 → 実行 → ステップごとの結果表示
 *
 * このテストは以下のフローをE2E的に検証する:
 * 1. TestControllerがファイルを検出してTestItemを作成
 * 2. テスト実行を開始
 * 3. FlowRunnerが実際のCLIを起動
 * 4. CLIからの進捗イベントを受信
 * 5. TestRunに正しい結果が記録される
 *
 * 前提条件:
 * - enbu CLIがビルド済み（apps/cli/dist/main.mjs）
 * - fixtureファイルが存在（src/fixtures/simple.enbu.yaml）
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import {
  MockTestController,
  MockTestRun,
  MockCancellationToken,
  MockTextDocument,
  MockTextEditorDecorationType,
  Uri,
  workspace,
  tests,
  createMockExtensionContext,
  type MockTestItem,
  type MockWorkspaceFolder,
} from './__mocks__/vscode';
import { StepHighlighter } from './stepHighlighter';

// createEnbuTestControllerをインポート
import { createEnbuTestController } from './testController';

// テスト用のパス設定
const currentFileDir = dirname(fileURLToPath(import.meta.url));
const fixtureFilePath = resolve(currentFileDir, 'fixtures', 'simple.enbu.yaml');
// currentFileDir = apps/vscode-extension/src
// monorepoRoot = apps/vscode-extension/src/../../.. = モノレポルート
const monorepoRoot = resolve(currentFileDir, '../../..');

describe('VSCode拡張 E2Eテスト', () => {
  // モックのリセット
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ユースケース: ファイル検出 → 実行 → 結果表示', () => {
    it('実際のCLIを呼び出してフローを実行し、イベントを受信する', async () => {
      // === 準備 ===

      // fixtureファイルの内容を読み込む
      const yamlContent = readFileSync(fixtureFilePath, 'utf-8');

      // ファイルURI（fixture）
      const fileUri = Uri.file(fixtureFilePath);

      // ワークスペースフォルダのモック（モノレポルート）
      const workspaceFolder: MockWorkspaceFolder = {
        uri: Uri.file(monorepoRoot),
        name: 'enbu-monorepo',
        index: 0,
      };

      // VSCode APIのモック設定
      (workspace.findFiles as Mock).mockResolvedValue([fileUri]);
      (workspace.openTextDocument as Mock).mockResolvedValue(
        new MockTextDocument(fileUri, yamlContent),
      );
      (workspace.getWorkspaceFolder as Mock).mockReturnValue(workspaceFolder);
      (workspace.asRelativePath as Mock).mockReturnValue('fixtures/simple.enbu.yaml');

      // FileSystemWatcherのモック
      (workspace.createFileSystemWatcher as Mock).mockReturnValue({
        onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
        onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
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

      // StepHighlighterのモック
      const mockDecorationType =
        new MockTextEditorDecorationType() as unknown as import('vscode').TextEditorDecorationType;
      const stepHighlighter = new StepHighlighter(mockDecorationType);

      // === 実行: TestControllerを作成 ===
      // @ts-expect-error - テスト実行時はvscodeモジュールがモックに置き換えられる
      createEnbuTestController(mockContext, stepHighlighter);

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
      expect(fileItem!.label).toBe('fixtures/simple.enbu.yaml');

      // ステップの子TestItemを確認（simple.enbu.yamlは2ステップ）
      expect(fileItem!.children.size).toBe(2);

      // 各ステップのラベルを確認
      const stepLabels: string[] = [];
      fileItem!.children.forEach((step) => {
        stepLabels.push(step.label);
      });
      expect(stepLabels).toContain('Step 1: open');
      expect(stepLabels).toContain('Step 2: screenshot');

      // === 実行: テストを実行 ===
      expect(capturedRunHandler).not.toBeNull();

      // テスト実行リクエスト
      const testRun = new MockTestRun();
      controller.createTestRun = () => testRun;

      const token = new MockCancellationToken();

      // runHandlerを実行（非同期）
      // このハンドラー内部でFlowRunnerが作成され、実際のCLI呼び出しが行われる
      const runPromise = capturedRunHandler!({ include: [fileItem!] }, token);

      // 実際のCLI実行完了を待機
      await runPromise;

      // === 検証: TestRunに正しい結果が記録された ===
      const records = testRun.records;

      // ファイルのstartedを確認
      const fileStarted = records.find((r) => r.type === 'started' && r.item.id === fileItem!.id);
      expect(fileStarted).toBeDefined();

      // ファイルのpassedを確認
      const filePassed = records.find((r) => r.type === 'passed' && r.item.id === fileItem!.id);
      expect(filePassed).toBeDefined();
      expect(filePassed!.duration).toBeGreaterThan(0);

      // 各ステップのstartedとpassedを確認
      const stepRecords = records.filter((r) => r.item.id !== fileItem!.id);

      // 2ステップ × (enqueued + started + passed) = 6件
      const enqueuedRecords = stepRecords.filter((r) => r.type === 'enqueued');
      const startedRecords = stepRecords.filter((r) => r.type === 'started');
      const passedRecords = stepRecords.filter((r) => r.type === 'passed');

      expect(enqueuedRecords.length).toBe(2);
      expect(startedRecords.length).toBe(2);
      expect(passedRecords.length).toBe(2);

      // durationが記録されていることを確認（実際の時間なので具体値は不定）
      for (const record of passedRecords) {
        expect(record.duration).toBeGreaterThan(0);
      }
    }, 60000); // タイムアウト60秒
  });
});
