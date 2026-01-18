/**
 * デコレーション管理
 *
 * VS Codeのテキストエディタ上でステップの実行状態を視覚的に表示する。
 * ステップの行番号とデコレーションタイプを管理し、進捗に応じて更新する。
 */

import * as vscode from 'vscode';
import { getStepLineNumbers } from '@packages/core';
import type { StepStartMessage, StepCompleteMessage } from './types';

/**
 * デコレーションタイプ
 *
 * 各ステップの状態に対応するデコレーション。
 */
type DecorationTypes = {
  pending: vscode.TextEditorDecorationType;
  running: vscode.TextEditorDecorationType;
  passed: vscode.TextEditorDecorationType;
  failed: vscode.TextEditorDecorationType;
};

/**
 * ステップの状態
 */
type StepState = 'pending' | 'running' | 'passed' | 'failed';

/**
 * デコレーション管理クラス
 *
 * YAMLファイル内の各ステップ行にガターアイコンとスタイルを適用する。
 * ステップの進捗に応じてデコレーションを動的に更新する。
 */
export class DecorationManager {
  private readonly decorationTypes: DecorationTypes;
  private readonly stepLineNumbers: number[];
  private readonly stepStates: Map<number, StepState>;
  private readonly editor: vscode.TextEditor;

  /**
   * コンストラクタ
   *
   * デコレーションタイプを作成し、YAMLファイルから各ステップの行番号を取得する。
   *
   * @param editor - 対象のテキストエディタ
   * @param yamlContent - YAMLファイルの内容
   */
  constructor(editor: vscode.TextEditor, yamlContent: string) {
    this.editor = editor;
    this.decorationTypes = this.createDecorationTypes();
    this.stepStates = new Map();

    // YAMLからステップの行番号を取得
    const lineNumbersResult = getStepLineNumbers(yamlContent);
    this.stepLineNumbers = lineNumbersResult.match(
      (lineNumbers: number[]) => lineNumbers,
      (error: unknown) => {
        console.error('Failed to get step line numbers:', error);
        return [];
      },
    );

    // 初期状態は全てpending
    for (let i = 0; i < this.stepLineNumbers.length; i++) {
      this.stepStates.set(i, 'pending');
    }

    // 初期デコレーションを適用
    this.updateDecorations();
  }

  /**
   * デコレーションタイプを作成する
   *
   * 各状態に対応するガターアイコンとスタイルを定義する。
   *
   * @returns デコレーションタイプの辞書
   */
  private createDecorationTypes(): DecorationTypes {
    const extensionPath =
      vscode.extensions.getExtension('agent-browser-flow.enbu-vscode')?.extensionPath ?? '';

    return {
      pending: vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.file(`${extensionPath}/assets/icons/pending.svg`),
        gutterIconSize: 'contain',
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
      }),
      running: vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.file(`${extensionPath}/assets/icons/running.svg`),
        gutterIconSize: 'contain',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
      }),
      passed: vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.file(`${extensionPath}/assets/icons/passed.svg`),
        gutterIconSize: 'contain',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
      }),
      failed: vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.file(`${extensionPath}/assets/icons/failed.svg`),
        gutterIconSize: 'contain',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
      }),
    };
  }

  /**
   * ステップ開始時にデコレーションを更新する
   *
   * @param message - ステップ開始メッセージ
   */
  public onStepStart(message: StepStartMessage): void {
    this.stepStates.set(message.stepIndex, 'running');
    this.updateDecorations();
  }

  /**
   * ステップ完了時にデコレーションを更新する
   *
   * @param message - ステップ完了メッセージ
   */
  public onStepComplete(message: StepCompleteMessage): void {
    this.stepStates.set(message.stepIndex, message.status);
    this.updateDecorations();
  }

  /**
   * デコレーションを更新する
   *
   * 現在の各ステップの状態に基づいて、エディタのデコレーションを再適用する。
   */
  private updateDecorations(): void {
    // 各状態ごとに適用する範囲をグループ化
    const decorationRanges: Record<StepState, vscode.Range[]> = {
      pending: [],
      running: [],
      passed: [],
      failed: [],
    };

    for (const [stepIndex, state] of this.stepStates.entries()) {
      const lineNumber = this.stepLineNumbers[stepIndex];
      if (lineNumber === undefined) {
        continue;
      }

      // VS Codeの行番号は0始まり、getStepLineNumbersは1始まりなので変換
      const line = lineNumber - 1;
      const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
      decorationRanges[state].push(range);
    }

    // 各デコレーションタイプを適用
    this.editor.setDecorations(this.decorationTypes.pending, decorationRanges.pending);
    this.editor.setDecorations(this.decorationTypes.running, decorationRanges.running);
    this.editor.setDecorations(this.decorationTypes.passed, decorationRanges.passed);
    this.editor.setDecorations(this.decorationTypes.failed, decorationRanges.failed);
  }

  /**
   * 全てのデコレーションをクリアする
   *
   * 拡張機能の非アクティブ化時やフロー実行終了時に呼び出す。
   */
  public clear(): void {
    this.editor.setDecorations(this.decorationTypes.pending, []);
    this.editor.setDecorations(this.decorationTypes.running, []);
    this.editor.setDecorations(this.decorationTypes.passed, []);
    this.editor.setDecorations(this.decorationTypes.failed, []);
  }

  /**
   * デコレーションタイプを破棄する
   *
   * メモリリークを防ぐため、拡張機能の非アクティブ化時に呼び出す必要がある。
   */
  public dispose(): void {
    this.decorationTypes.pending.dispose();
    this.decorationTypes.running.dispose();
    this.decorationTypes.passed.dispose();
    this.decorationTypes.failed.dispose();
  }
}
