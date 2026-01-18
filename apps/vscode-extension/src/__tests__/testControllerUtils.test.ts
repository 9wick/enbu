/**
 * testControllerUtils.ts のユニットテスト
 *
 * VSCode Test API関連のユーティリティ関数をテストする。
 * vscodeモジュールはモックを使用してテスト環境で動作可能にする。
 */

import { describe, it, expect } from 'vitest';
import {
  Uri,
  Range,
  TestMessage,
  MockTestRun,
  MockTestItemCollection,
  MockTestController,
  type MockTestItem,
} from '../__mocks__/vscode';
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
} from '../testControllerUtils';

/**
 * テスト用のモックTestItemを作成する
 *
 * @param id - TestItemのID
 * @param label - 表示ラベル
 * @param uri - ファイルURI（省略可）
 * @param parent - 親TestItem（省略可）
 * @returns MockTestItem
 */
const createMockTestItem = (
  id: string,
  label: string,
  uri?: Uri,
  parent?: MockTestItem,
): MockTestItem => ({
  id,
  label,
  uri,
  parent,
  children: new MockTestItemCollection(),
  canResolveChildren: false,
  busy: false,
  tags: [],
});

/**
 * TestMessage作成ヘルパー
 */
const createTestMessage = (text: string): TestMessage => new TestMessage(text);

describe('extractStepLabel', () => {
  describe('正常系: YAML形式のステップ行からラベルを抽出できること', () => {
    it('先頭のステップ（index=0）の場合、「Step 1: アクション名」形式で返す', () => {
      // 前提条件: "- goto:" という形式のYAML行
      const lineText = '  - goto:';
      const index = 0;

      // 実行
      const result = extractStepLabel(lineText, index);

      // 検証: Step番号は1始まり、アクション名が含まれる
      expect(result).toBe('Step 1: goto');
    });

    it('2番目のステップ（index=1）の場合、「Step 2: アクション名」形式で返す', () => {
      // 前提条件: "- click:" という形式のYAML行
      const lineText = '    - click:';
      const index = 1;

      // 実行
      const result = extractStepLabel(lineText, index);

      // 検証
      expect(result).toBe('Step 2: click');
    });

    it('様々なアクション名を正しく抽出できること', () => {
      // 前提条件: 各種アクション名
      const testCases = [
        { lineText: '- assert:', index: 0, expected: 'Step 1: assert' },
        { lineText: '  - waitFor:', index: 2, expected: 'Step 3: waitFor' },
        { lineText: '    - screenshot:', index: 9, expected: 'Step 10: screenshot' },
      ];

      for (const { lineText, index, expected } of testCases) {
        expect(extractStepLabel(lineText, index)).toBe(expected);
      }
    });
  });

  describe('異常系: 不正な形式の場合', () => {
    it('YAML形式でない行の場合、「Step N」のみ返す', () => {
      // 前提条件: YAML形式でない行
      const lineText = 'invalid line';
      const index = 0;

      // 実行
      const result = extractStepLabel(lineText, index);

      // 検証: アクション名なしのデフォルト形式
      expect(result).toBe('Step 1');
    });

    it('空行の場合、「Step N」のみ返す', () => {
      const result = extractStepLabel('', 0);
      expect(result).toBe('Step 1');
    });

    it('コメント行の場合、「Step N」のみ返す', () => {
      const result = extractStepLabel('# comment', 0);
      expect(result).toBe('Step 1');
    });
  });
});

describe('collectItemsFromInclude', () => {
  describe('正常系: ファイルTestItemが選択された場合', () => {
    it('選択されたファイルTestItemをそのまま返す', () => {
      // 前提条件: 親のないTestItem（=ファイルレベル）
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

      // 実行
      const result = collectItemsFromInclude([fileItem]);

      // 検証
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(fileItem);
    });

    it('複数のファイルTestItemが選択された場合、全て返す', () => {
      const fileItem1 = createMockTestItem('file1', 'test1.enbu.yaml');
      const fileItem2 = createMockTestItem('file2', 'test2.enbu.yaml');

      const result = collectItemsFromInclude([fileItem1, fileItem2]);

      expect(result).toHaveLength(2);
      expect(result).toContain(fileItem1);
      expect(result).toContain(fileItem2);
    });
  });

  describe('正常系: ステップTestItemが選択された場合', () => {
    it('親ファイルTestItemを返す', () => {
      // 前提条件: 親を持つTestItem（=ステップレベル）
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml');
      const stepItem = createMockTestItem('step1', 'Step 1: goto', undefined, fileItem);

      // 実行
      const result = collectItemsFromInclude([stepItem]);

      // 検証: ステップの親（ファイル）が返される
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(fileItem);
    });

    it('同じファイルの複数ステップが選択された場合、親は重複しない', () => {
      // 前提条件: 同じ親を持つ複数のステップ
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml');
      const step1 = createMockTestItem('step1', 'Step 1', undefined, fileItem);
      const step2 = createMockTestItem('step2', 'Step 2', undefined, fileItem);
      const step3 = createMockTestItem('step3', 'Step 3', undefined, fileItem);

      // 実行
      const result = collectItemsFromInclude([step1, step2, step3]);

      // 検証: 親は1つだけ返される（重複なし）
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(fileItem);
    });
  });

  describe('正常系: ファイルとステップが混在する場合', () => {
    it('ファイルはそのまま、ステップは親に変換して返す', () => {
      const fileItem1 = createMockTestItem('file1', 'test1.enbu.yaml');
      const fileItem2 = createMockTestItem('file2', 'test2.enbu.yaml');
      const stepItem = createMockTestItem('step1', 'Step 1', undefined, fileItem2);

      // 実行: file1とfile2のstepを選択
      const result = collectItemsFromInclude([fileItem1, stepItem]);

      // 検証: file1とfile2（stepの親）が返される
      expect(result).toHaveLength(2);
      expect(result).toContain(fileItem1);
      expect(result).toContain(fileItem2);
    });
  });

  describe('境界値: 空の配列', () => {
    it('空の配列が渡された場合、空の配列を返す', () => {
      const result = collectItemsFromInclude([]);
      expect(result).toHaveLength(0);
    });
  });
});

describe('collectAllItems', () => {
  it('controller.itemsの全てのTestItemを配列として返す', () => {
    // 前提条件: TestControllerに複数のアイテムがある
    const controller = new MockTestController('test', 'Test');
    const item1 = controller.createTestItem('item1', 'Item 1');
    const item2 = controller.createTestItem('item2', 'Item 2');
    controller.items.add(item1);
    controller.items.add(item2);

    // 実行
    const result = collectAllItems(controller);

    // 検証
    expect(result).toHaveLength(2);
  });

  it('controller.itemsが空の場合、空の配列を返す', () => {
    const controller = new MockTestController('test', 'Test');

    const result = collectAllItems(controller);

    expect(result).toHaveLength(0);
  });
});

describe('filterExcludedItems', () => {
  describe('正常系: excludeがある場合', () => {
    it('exclude に含まれるアイテムを除外する', () => {
      const item1 = createMockTestItem('item1', 'Item 1');
      const item2 = createMockTestItem('item2', 'Item 2');
      const item3 = createMockTestItem('item3', 'Item 3');

      // 実行: item2を除外
      const result = filterExcludedItems([item1, item2, item3], [item2]);

      // 検証: item1とitem3のみ残る
      expect(result).toHaveLength(2);
      expect(result).toContain(item1);
      expect(result).toContain(item3);
      expect(result).not.toContain(item2);
    });

    it('複数のアイテムを除外できる', () => {
      const item1 = createMockTestItem('item1', 'Item 1');
      const item2 = createMockTestItem('item2', 'Item 2');
      const item3 = createMockTestItem('item3', 'Item 3');

      const result = filterExcludedItems([item1, item2, item3], [item1, item3]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(item2);
    });
  });

  describe('正常系: excludeがない場合', () => {
    it('undefinedの場合、全てのアイテムを返す', () => {
      const item1 = createMockTestItem('item1', 'Item 1');
      const item2 = createMockTestItem('item2', 'Item 2');

      const result = filterExcludedItems([item1, item2], undefined);

      expect(result).toHaveLength(2);
    });
  });

  describe('境界値', () => {
    it('空のitems配列の場合、空の配列を返す', () => {
      const result = filterExcludedItems([], [createMockTestItem('item1', 'Item 1')]);
      expect(result).toHaveLength(0);
    });

    it('空のexclude配列の場合、全てのアイテムを返す', () => {
      const item1 = createMockTestItem('item1', 'Item 1');
      const result = filterExcludedItems([item1], []);
      expect(result).toHaveLength(1);
    });
  });
});

describe('handleStepStart', () => {
  it('指定されたstepIndexのステップをstarted状態にする', () => {
    // 前提条件
    const run = new MockTestRun();
    const step0 = createMockTestItem('step0', 'Step 1');
    const step1 = createMockTestItem('step1', 'Step 2');
    const stepItems = [step0, step1];

    // 実行: stepIndex=0のステップを開始
    handleStepStart(run, stepItems, { type: 'step:start', stepIndex: 0, stepTotal: 2 });

    // 検証
    expect(run.records).toHaveLength(1);
    expect(run.records[0]?.type).toBe('started');
    expect(run.records[0]?.item).toBe(step0);
  });

  it('stepIndexが範囲外の場合、何もしない', () => {
    const run = new MockTestRun();
    const stepItems = [createMockTestItem('step0', 'Step 1')];

    // 実行: 存在しないindex
    handleStepStart(run, stepItems, { type: 'step:start', stepIndex: 99, stepTotal: 1 });

    // 検証: 何も記録されない
    expect(run.records).toHaveLength(0);
  });
});

describe('handleStepComplete', () => {
  describe('成功時', () => {
    it('ステップをpassed状態にし、実行時間を記録する', () => {
      const run = new MockTestRun();
      const step0 = createMockTestItem('step0', 'Step 1');
      const stepItems = [step0];

      // 実行
      handleStepComplete(
        run,
        stepItems,
        { type: 'step:complete', stepIndex: 0, stepTotal: 1, status: 'passed', duration: 123 },
        createTestMessage,
      );

      // 検証
      expect(run.records).toHaveLength(1);
      expect(run.records[0]?.type).toBe('passed');
      expect(run.records[0]?.duration).toBe(123);
    });
  });

  describe('失敗時', () => {
    it('ステップをfailed状態にし、エラーメッセージを記録する', () => {
      const run = new MockTestRun();
      const uri = Uri.file('/test/file.enbu.yaml');
      const step0 = createMockTestItem('step0', 'Step 1', uri);
      step0.range = new Range(0, 0, 0, 10);
      const stepItems = [step0];

      // 実行
      handleStepComplete(
        run,
        stepItems,
        {
          type: 'step:complete',
          stepIndex: 0,
          stepTotal: 1,
          status: 'failed',
          duration: 50,
          error: 'テスト失敗エラー',
        },
        createTestMessage,
      );

      // 検証
      expect(run.records).toHaveLength(1);
      expect(run.records[0]?.type).toBe('failed');
      expect(run.records[0]?.message?.message).toBe('テスト失敗エラー');
      expect(run.records[0]?.duration).toBe(50);
    });

    it('エラーメッセージがない場合、デフォルトメッセージを使用する', () => {
      const run = new MockTestRun();
      const step0 = createMockTestItem('step0', 'Step 1');
      const stepItems = [step0];

      handleStepComplete(
        run,
        stepItems,
        { type: 'step:complete', stepIndex: 0, stepTotal: 1, status: 'failed', duration: 50 },
        createTestMessage,
      );

      expect(run.records[0]?.message?.message).toBe('ステップが失敗しました');
    });
  });

  it('stepIndexが範囲外の場合、何もしない', () => {
    const run = new MockTestRun();
    const stepItems: MockTestItem[] = [];

    handleStepComplete(
      run,
      stepItems,
      { type: 'step:complete', stepIndex: 0, stepTotal: 0, status: 'passed', duration: 0 },
      createTestMessage,
    );

    expect(run.records).toHaveLength(0);
  });
});

describe('handleFlowComplete', () => {
  describe('成功時', () => {
    it('ファイルをpassed状態にし、実行時間を記録する', () => {
      const run = new MockTestRun();
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

      handleFlowComplete(
        run,
        fileItem,
        { type: 'flow:complete', flowName: 'テストフロー', status: 'passed', duration: 1000 },
        createTestMessage,
      );

      expect(run.records).toHaveLength(1);
      expect(run.records[0]?.type).toBe('passed');
      expect(run.records[0]?.item).toBe(fileItem);
      expect(run.records[0]?.duration).toBe(1000);
    });
  });

  describe('失敗時', () => {
    it('ファイルをfailed状態にし、エラーメッセージを記録する', () => {
      const run = new MockTestRun();
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

      handleFlowComplete(
        run,
        fileItem,
        { type: 'flow:complete', flowName: 'テストフロー', status: 'failed', duration: 500 },
        createTestMessage,
      );

      expect(run.records).toHaveLength(1);
      expect(run.records[0]?.type).toBe('failed');
      expect(run.records[0]?.message?.message).toBe('フローが失敗しました');
    });
  });
});

describe('handleCancellation', () => {
  it('ファイルと全ステップをskipped状態にする', () => {
    const run = new MockTestRun();
    const fileItem = createMockTestItem('file1', 'test.enbu.yaml');
    const step0 = createMockTestItem('step0', 'Step 1');
    const step1 = createMockTestItem('step1', 'Step 2');
    const stepItems = [step0, step1];

    handleCancellation(run, fileItem, stepItems);

    // 検証: ファイル + 2ステップ = 3つのskipped
    expect(run.records).toHaveLength(3);
    expect(run.records.every((r) => r.type === 'skipped')).toBe(true);
    expect(run.records[0]?.item).toBe(fileItem);
    expect(run.records[1]?.item).toBe(step0);
    expect(run.records[2]?.item).toBe(step1);
  });

  it('ステップがない場合、ファイルのみskipped状態にする', () => {
    const run = new MockTestRun();
    const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

    handleCancellation(run, fileItem, []);

    expect(run.records).toHaveLength(1);
    expect(run.records[0]?.item).toBe(fileItem);
  });
});

describe('validateFlowTestParams', () => {
  describe('正常系', () => {
    it('有効なfileItemの場合、filePath と workspaceRoot を返す', () => {
      const uri = Uri.file('/workspace/project/test.enbu.yaml');
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml', uri);
      const workspaceFolder = {
        uri: Uri.file('/workspace/project'),
        name: 'project',
        index: 0,
      };

      const result = validateFlowTestParams(fileItem, () => workspaceFolder);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.filePath).toBe('/workspace/project/test.enbu.yaml');
        expect(result.workspaceRoot).toBe('/workspace/project');
      }
    });
  });

  describe('異常系', () => {
    it('uriがない場合、skip エラーを返す', () => {
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

      const result = validateFlowTestParams(fileItem, () => undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('skip');
      }
    });

    it('ワークスペースフォルダがない場合、エラーメッセージを返す', () => {
      const uri = Uri.file('/test/file.enbu.yaml');
      const fileItem = createMockTestItem('file1', 'test.enbu.yaml', uri);

      const result = validateFlowTestParams(fileItem, () => undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('ワークスペースフォルダが見つかりません');
      }
    });
  });
});

describe('handleValidationError', () => {
  it('errorが"skip"の場合、アイテムをskipped状態にする', () => {
    const run = new MockTestRun();
    const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

    handleValidationError(run, fileItem, 'skip', createTestMessage);

    expect(run.records).toHaveLength(1);
    expect(run.records[0]?.type).toBe('skipped');
  });

  it('他のエラーの場合、アイテムをerrored状態にする', () => {
    const run = new MockTestRun();
    const fileItem = createMockTestItem('file1', 'test.enbu.yaml');

    handleValidationError(
      run,
      fileItem,
      'ワークスペースフォルダが見つかりません',
      createTestMessage,
    );

    expect(run.records).toHaveLength(1);
    expect(run.records[0]?.type).toBe('errored');
    expect(run.records[0]?.message?.message).toBe('ワークスペースフォルダが見つかりません');
  });
});

describe('enqueueSteps', () => {
  it('全てのステップをenqueued状態にする', () => {
    const run = new MockTestRun();
    const step0 = createMockTestItem('step0', 'Step 1');
    const step1 = createMockTestItem('step1', 'Step 2');
    const step2 = createMockTestItem('step2', 'Step 3');
    const stepItems = [step0, step1, step2];

    enqueueSteps(run, stepItems);

    expect(run.records).toHaveLength(3);
    expect(run.records.every((r) => r.type === 'enqueued')).toBe(true);
  });

  it('ステップがない場合、何もしない', () => {
    const run = new MockTestRun();

    enqueueSteps(run, []);

    expect(run.records).toHaveLength(0);
  });
});
