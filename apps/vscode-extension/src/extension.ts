/**
 * Enbu VS Code拡張機能
 *
 * enbu.yamlファイルをVSCode Test Explorerで管理し、
 * フロー実行と各ステップの進捗をリアルタイムで表示する。
 *
 * 機能:
 * - Test Explorerにenbu.yamlファイルを自動検出・表示
 * - ファイル単位での実行（ステップ単位の実行はなし）
 * - 各ステップの実行状態をリアルタイム表示
 * - 実行のキャンセル対応
 */

import * as vscode from 'vscode';
import { createEnbuTestController } from './testController';
import { StepHighlighter } from './stepHighlighter';

/**
 * 拡張機能のアクティベーション
 *
 * VS Codeが拡張機能をロードした際に呼び出される。
 * Test Controllerを作成し、テストの検出・実行を初期化する。
 *
 * @param context - 拡張機能のコンテキスト
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Enbu VS Code extension is now active');

  // ステップハイライト用のDecorationTypeを作成
  const runningStepDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(255, 255, 0, 0.15)', // 薄い黄色
  });
  context.subscriptions.push(runningStepDecorationType);

  // StepHighlighterのインスタンスを作成
  const stepHighlighter = new StepHighlighter(runningStepDecorationType);

  // Test Controllerを作成
  createEnbuTestController(context, stepHighlighter);
}

/**
 * 拡張機能の非アクティベーション
 *
 * VS Codeが拡張機能をアンロードする際に呼び出される。
 * リソースのクリーンアップを行う。
 */
export function deactivate(): void {
  console.log('Enbu VS Code extension is now deactivated');
}
