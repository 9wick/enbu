/**
 * ステップハイライト管理モジュール
 *
 * テスト実行中のステップの行をハイライトする責務を持つ。
 * DecorationTypeを保持し、ステップのハイライト表示/非表示を管理する。
 */

import * as vscode from 'vscode';

/**
 * ステップハイライトを管理するクラス
 *
 * テスト実行中のステップの行を視覚的にハイライト表示する。
 * 1つのDecorationTypeを共有し、複数エディタに対応する。
 */
export class StepHighlighter {
  /**
   * コンストラクタ
   *
   * @param decorationType - ハイライト用のDecorationTypeインスタンス
   */
  constructor(private readonly decorationType: vscode.TextEditorDecorationType) {}

  /**
   * 指定されたTestItemの行をハイライトする
   *
   * TestItemのuriに対応する全ての可視エディタにデコレーションを適用する。
   * uriまたはrangeがない場合は何もしない。
   *
   * @param testItem - ハイライト対象のTestItem
   */
  highlightStep(testItem: vscode.TestItem): void {
    if (!testItem.uri || !testItem.range) {
      return;
    }

    const editors = this.findEditorsForUri(testItem.uri);
    for (const editor of editors) {
      editor.setDecorations(this.decorationType, [testItem.range]);
    }
  }

  /**
   * 指定されたTestItemのハイライトをクリアする
   *
   * TestItemのuriに対応する全ての可視エディタからデコレーションを削除する。
   * uriがない場合は何もしない。
   *
   * @param testItem - クリア対象のTestItem
   */
  clearStepHighlight(testItem: vscode.TestItem): void {
    if (!testItem.uri) {
      return;
    }

    const editors = this.findEditorsForUri(testItem.uri);
    for (const editor of editors) {
      editor.setDecorations(this.decorationType, []);
    }
  }

  /**
   * すべてのハイライトをクリアする
   *
   * キャンセル時やエラー時に使用。
   * 全ての可視エディタからデコレーションを削除する。
   */
  clearAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(this.decorationType, []);
    }
  }

  /**
   * 指定されたURIに対応するエディタを取得する
   *
   * 同じファイルを複数エディタで開いている場合、全てを返す。
   *
   * @param uri - ファイルURI
   * @returns マッチするエディタの配列
   */
  private findEditorsForUri(uri: vscode.Uri): vscode.TextEditor[] {
    return vscode.window.visibleTextEditors.filter(
      (editor) => editor.document.uri.toString() === uri.toString(),
    );
  }
}
