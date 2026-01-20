/**
 * stepHighlighter.ts のユニットテスト
 *
 * ステップハイライト機能をテストする。
 * vscodeモジュールはモックを使用してテスト環境で動作可能にする。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type * as vscode from 'vscode';
import {
  Uri,
  Range,
  MockTextEditor,
  MockTextEditorDecorationType,
  MockTextDocument,
  MockTestItemCollection,
  window,
  type MockTestItem,
} from '../__mocks__/vscode';
import { StepHighlighter } from '../stepHighlighter';

/**
 * テスト用のMockTestItemを作成するヘルパー
 *
 * @param id - TestItemのID
 * @param label - 表示ラベル
 * @param uri - ファイルURI（省略可）
 * @param range - 範囲（省略可）
 * @returns MockTestItem（vscode.TestItemとして使用可能）
 */
const createMockTestItem = (
  id: string,
  label: string,
  uri?: Uri,
  range?: Range,
): vscode.TestItem => {
  const mockItem: MockTestItem = {
    id,
    label,
    uri: uri as vscode.Uri | undefined,
    range: range as vscode.Range | undefined,
    parent: undefined,
    children: new MockTestItemCollection(),
    canResolveChildren: false,
    busy: false,
    tags: [],
  };
  return mockItem as vscode.TestItem;
};

describe('StepHighlighter', () => {
  let mockDecorationType: MockTextEditorDecorationType;
  let highlighter: StepHighlighter;

  beforeEach(() => {
    // 各テストの前にwindow.visibleTextEditorsをリセット
    window.visibleTextEditors = [];
    // 新しいデコレーションタイプを作成
    mockDecorationType = new MockTextEditorDecorationType();
    const decorationType = mockDecorationType as vscode.TextEditorDecorationType;
    highlighter = new StepHighlighter(decorationType);
  });

  describe('highlightStep', () => {
    describe('正常系: uriとrangeが揃っている場合', () => {
      it('TestItemにuriとrangeがある場合、対応エディタにデコレーション適用', () => {
        // 前提条件: エディタが1つあり、TestItemが対応するuriとrangeを持つ
        const uri = Uri.file('/test/sample.enbu.yaml');
        const range = new Range(5, 0, 5, 20);
        const testItem = createMockTestItem('step1', 'Step 1: goto', uri, range);
        const document = new MockTextDocument(uri, 'test content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        // 実行
        highlighter.highlightStep(testItem);

        // 検証: エディタにデコレーションが適用される
        const decorations = editor.getDecorations(mockDecorationType);
        expect(decorations).toHaveLength(1);
        expect(decorations[0]).toBe(range);
      });

      it('複数エディタで同じファイルが開かれている場合、全てに適用', () => {
        // 前提条件: 同じファイルを3つのエディタで開いている
        const uri = Uri.file('/test/sample.enbu.yaml');
        const range = new Range(10, 0, 10, 15);
        const testItem = createMockTestItem('step2', 'Step 2: click', uri, range);
        const document = new MockTextDocument(uri, 'test content');
        const editor1 = new MockTextEditor(document);
        const editor2 = new MockTextEditor(document);
        const editor3 = new MockTextEditor(document);
        window.visibleTextEditors = [editor1, editor2, editor3];

        // 実行
        highlighter.highlightStep(testItem);

        // 検証: 全てのエディタにデコレーションが適用される
        expect(editor1.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(editor2.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(editor3.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(editor1.getDecorations(mockDecorationType)[0]).toBe(range);
        expect(editor2.getDecorations(mockDecorationType)[0]).toBe(range);
        expect(editor3.getDecorations(mockDecorationType)[0]).toBe(range);
      });

      it('複数のエディタがあるが対応するファイルは1つの場合、該当エディタのみに適用', () => {
        // 前提条件: 異なるファイルを開く複数のエディタがあり、うち1つだけがTestItemと一致
        const targetUri = Uri.file('/test/target.enbu.yaml');
        const otherUri1 = Uri.file('/test/other1.enbu.yaml');
        const otherUri2 = Uri.file('/test/other2.enbu.yaml');
        const range = new Range(3, 0, 3, 10);
        const testItem = createMockTestItem('step3', 'Step 3: assert', targetUri, range);

        const targetDocument = new MockTextDocument(targetUri, 'target content');
        const otherDocument1 = new MockTextDocument(otherUri1, 'other content 1');
        const otherDocument2 = new MockTextDocument(otherUri2, 'other content 2');

        const targetEditor = new MockTextEditor(targetDocument);
        const otherEditor1 = new MockTextEditor(otherDocument1);
        const otherEditor2 = new MockTextEditor(otherDocument2);

        window.visibleTextEditors = [otherEditor1, targetEditor, otherEditor2];

        // 実行
        highlighter.highlightStep(testItem);

        // 検証: 対応するエディタのみデコレーションが適用される
        expect(targetEditor.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(targetEditor.getDecorations(mockDecorationType)[0]).toBe(range);
        expect(otherEditor1.getDecorations(mockDecorationType)).toHaveLength(0);
        expect(otherEditor2.getDecorations(mockDecorationType)).toHaveLength(0);
      });
    });

    describe('異常系: uriまたはrangeが欠けている場合', () => {
      it('TestItemにuriがない場合、何もしない', () => {
        // 前提条件: uriがないTestItem
        const range = new Range(1, 0, 1, 10);
        const testItem = createMockTestItem('step_no_uri', 'Step without uri', undefined, range);
        const uri = Uri.file('/test/sample.enbu.yaml');
        const document = new MockTextDocument(uri, 'content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        // 実行
        highlighter.highlightStep(testItem);

        // 検証: デコレーションは適用されない
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);
      });

      it('TestItemにrangeがない場合、何もしない', () => {
        // 前提条件: rangeがないTestItem
        const uri = Uri.file('/test/sample.enbu.yaml');
        const testItem = createMockTestItem('step_no_range', 'Step without range', uri, undefined);
        const document = new MockTextDocument(uri, 'content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        // 実行
        highlighter.highlightStep(testItem);

        // 検証: デコレーションは適用されない
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);
      });

      it('TestItemにuriもrangeもない場合、何もしない', () => {
        // 前提条件: uriもrangeもないTestItem
        const testItem = createMockTestItem('step_empty', 'Empty step', undefined, undefined);
        const uri = Uri.file('/test/sample.enbu.yaml');
        const document = new MockTextDocument(uri, 'content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        // 実行
        highlighter.highlightStep(testItem);

        // 検証: デコレーションは適用されない
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);
      });
    });

    describe('境界値: エディタが存在しない場合', () => {
      it('対応エディタがない場合、エラーにならない', () => {
        // 前提条件: エディタが全くない
        const uri = Uri.file('/test/sample.enbu.yaml');
        const range = new Range(2, 0, 2, 5);
        const testItem = createMockTestItem('step_no_editor', 'Step no editor', uri, range);
        window.visibleTextEditors = [];

        // 実行: エラーが発生しないことを確認
        expect(() => {
          highlighter.highlightStep(testItem);
        }).not.toThrow();
      });

      it('visibleTextEditorsが空配列の場合、エラーにならない', () => {
        // 前提条件: visibleTextEditorsが空
        const uri = Uri.file('/test/sample.enbu.yaml');
        const range = new Range(0, 0, 0, 1);
        const testItem = createMockTestItem('step_empty_editors', 'Step empty editors', uri, range);
        window.visibleTextEditors = [];

        // 実行: エラーが発生しないことを確認
        expect(() => {
          highlighter.highlightStep(testItem);
        }).not.toThrow();
      });
    });
  });

  describe('clearStepHighlight', () => {
    describe('正常系: ハイライトをクリアできること', () => {
      it('指定TestItemのハイライトをクリア', () => {
        // 前提条件: ハイライトが既に適用されているエディタがある
        const uri = Uri.file('/test/sample.enbu.yaml');
        const range = new Range(8, 0, 8, 12);
        const testItem = createMockTestItem('step_clear', 'Step to clear', uri, range);
        const document = new MockTextDocument(uri, 'content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        // ハイライトを適用
        highlighter.highlightStep(testItem);
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);

        // 実行: ハイライトをクリア
        highlighter.clearStepHighlight(testItem);

        // 検証: デコレーションが空配列で上書きされる
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);
      });

      it('複数エディタで同じファイルが開かれている場合、全てからクリア', () => {
        // 前提条件: 同じファイルを複数エディタで開いている
        const uri = Uri.file('/test/multi.enbu.yaml');
        const range = new Range(5, 5, 5, 15);
        const testItem = createMockTestItem('step_multi_clear', 'Step multi clear', uri, range);
        const document = new MockTextDocument(uri, 'content');
        const editor1 = new MockTextEditor(document);
        const editor2 = new MockTextEditor(document);
        window.visibleTextEditors = [editor1, editor2];

        // ハイライトを適用
        highlighter.highlightStep(testItem);
        expect(editor1.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(editor2.getDecorations(mockDecorationType)).toHaveLength(1);

        // 実行: ハイライトをクリア
        highlighter.clearStepHighlight(testItem);

        // 検証: 両方のエディタからクリアされる
        expect(editor1.getDecorations(mockDecorationType)).toHaveLength(0);
        expect(editor2.getDecorations(mockDecorationType)).toHaveLength(0);
      });
    });

    describe('異常系: uriがない場合', () => {
      it('TestItemにuriがない場合、何もしない', () => {
        // 前提条件: uriがないTestItem
        const testItem = createMockTestItem('step_no_uri_clear', 'No uri clear', undefined);
        const uri = Uri.file('/test/sample.enbu.yaml');
        const document = new MockTextDocument(uri, 'content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        // デコレーションを手動で設定
        editor.setDecorations(mockDecorationType, [new Range(1, 0, 1, 5)]);
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);

        // 実行: uriがないのでクリアされない
        highlighter.clearStepHighlight(testItem);

        // 検証: デコレーションはそのまま残る
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);
      });
    });

    describe('境界値: エディタが存在しない場合', () => {
      it('対応エディタがない場合、エラーにならない', () => {
        // 前提条件: 対応するエディタがない
        const uri = Uri.file('/test/missing.enbu.yaml');
        const testItem = createMockTestItem('step_missing_editor', 'Missing editor', uri);
        window.visibleTextEditors = [];

        // 実行: エラーが発生しないことを確認
        expect(() => {
          highlighter.clearStepHighlight(testItem);
        }).not.toThrow();
      });
    });
  });

  describe('clearAll', () => {
    describe('正常系: 全てのハイライトをクリアできること', () => {
      it('全visibleTextEditorsのハイライトをクリア', () => {
        // 前提条件: 複数のエディタがあり、それぞれデコレーションが適用されている
        const uri1 = Uri.file('/test/file1.enbu.yaml');
        const uri2 = Uri.file('/test/file2.enbu.yaml');
        const uri3 = Uri.file('/test/file3.enbu.yaml');
        const document1 = new MockTextDocument(uri1, 'content 1');
        const document2 = new MockTextDocument(uri2, 'content 2');
        const document3 = new MockTextDocument(uri3, 'content 3');
        const editor1 = new MockTextEditor(document1);
        const editor2 = new MockTextEditor(document2);
        const editor3 = new MockTextEditor(document3);
        window.visibleTextEditors = [editor1, editor2, editor3];

        // 各エディタにデコレーションを適用
        editor1.setDecorations(mockDecorationType, [new Range(1, 0, 1, 5)]);
        editor2.setDecorations(mockDecorationType, [new Range(2, 0, 2, 10)]);
        editor3.setDecorations(mockDecorationType, [new Range(3, 0, 3, 15)]);

        expect(editor1.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(editor2.getDecorations(mockDecorationType)).toHaveLength(1);
        expect(editor3.getDecorations(mockDecorationType)).toHaveLength(1);

        // 実行: 全てクリア
        highlighter.clearAll();

        // 検証: 全てのエディタからデコレーションがクリアされる
        expect(editor1.getDecorations(mockDecorationType)).toHaveLength(0);
        expect(editor2.getDecorations(mockDecorationType)).toHaveLength(0);
        expect(editor3.getDecorations(mockDecorationType)).toHaveLength(0);
      });

      it('エディタが1つだけの場合も正しくクリアされる', () => {
        // 前提条件: エディタが1つだけ
        const uri = Uri.file('/test/single.enbu.yaml');
        const document = new MockTextDocument(uri, 'content');
        const editor = new MockTextEditor(document);
        window.visibleTextEditors = [editor];

        editor.setDecorations(mockDecorationType, [new Range(0, 0, 0, 1)]);
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);

        // 実行
        highlighter.clearAll();

        // 検証
        expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);
      });
    });

    describe('境界値: エディタがない場合', () => {
      it('visibleTextEditorsが空の場合、エラーにならない', () => {
        // 前提条件: エディタが存在しない
        window.visibleTextEditors = [];

        // 実行: エラーが発生しないことを確認
        expect(() => {
          highlighter.clearAll();
        }).not.toThrow();
      });
    });
  });

  describe('統合シナリオ: ハイライトのライフサイクル', () => {
    it('ハイライト適用 → クリア → 再適用の流れが正しく動作する', () => {
      // 前提条件: エディタが1つ存在
      const uri = Uri.file('/test/lifecycle.enbu.yaml');
      const range1 = new Range(1, 0, 1, 10);
      const range2 = new Range(2, 0, 2, 15);
      const testItem1 = createMockTestItem('step1', 'Step 1', uri, range1);
      const testItem2 = createMockTestItem('step2', 'Step 2', uri, range2);
      const document = new MockTextDocument(uri, 'content');
      const editor = new MockTextEditor(document);
      window.visibleTextEditors = [editor];

      // 実行1: 最初のハイライト適用
      highlighter.highlightStep(testItem1);
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);
      expect(editor.getDecorations(mockDecorationType)[0]).toBe(range1);

      // 実行2: クリア
      highlighter.clearStepHighlight(testItem1);
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);

      // 実行3: 別のステップでハイライト再適用
      highlighter.highlightStep(testItem2);
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);
      expect(editor.getDecorations(mockDecorationType)[0]).toBe(range2);

      // 実行4: 全クリア
      highlighter.clearAll();
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(0);
    });

    it('複数ステップを順次ハイライトする場合、前のハイライトは上書きされる', () => {
      // 前提条件: エディタが1つ、複数のTestItemがある
      const uri = Uri.file('/test/sequential.enbu.yaml');
      const range1 = new Range(5, 0, 5, 8);
      const range2 = new Range(6, 0, 6, 12);
      const range3 = new Range(7, 0, 7, 20);
      const testItem1 = createMockTestItem('seq1', 'Seq 1', uri, range1);
      const testItem2 = createMockTestItem('seq2', 'Seq 2', uri, range2);
      const testItem3 = createMockTestItem('seq3', 'Seq 3', uri, range3);
      const document = new MockTextDocument(uri, 'content');
      const editor = new MockTextEditor(document);
      window.visibleTextEditors = [editor];

      // 実行: 順次ハイライト適用
      highlighter.highlightStep(testItem1);
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);
      expect(editor.getDecorations(mockDecorationType)[0]).toBe(range1);

      highlighter.highlightStep(testItem2);
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);
      expect(editor.getDecorations(mockDecorationType)[0]).toBe(range2);

      highlighter.highlightStep(testItem3);
      expect(editor.getDecorations(mockDecorationType)).toHaveLength(1);
      expect(editor.getDecorations(mockDecorationType)[0]).toBe(range3);
    });
  });
});
