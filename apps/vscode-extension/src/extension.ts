/**
 * Enbu VS Code拡張機能
 *
 * enbu.yamlファイルのフロー実行を可視化する。
 * コマンドパレットから "Enbu: Run Flow" を実行すると、
 * 現在開いているenbu.yamlファイルを実行し、各ステップの進捗を
 * エディタ上にインラインで表示する。
 */

import * as vscode from 'vscode';
import { FlowRunner } from './flowRunner';
import { DecorationManager } from './decorations';

/**
 * 拡張機能のアクティベーション
 *
 * VS Codeが拡張機能をロードした際に呼び出される。
 * コマンドを登録し、拡張機能を初期化する。
 *
 * @param context - 拡張機能のコンテキスト
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Enbu VS Code extension is now active');

  // "Enbu: Run Flow" コマンドを登録
  const runFlowCommand = vscode.commands.registerCommand('enbu.runFlow', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const document = editor.document;
    if (!document.fileName.endsWith('.enbu.yaml')) {
      vscode.window.showErrorMessage('Current file is not an enbu.yaml file');
      return;
    }

    // フロー実行を開始
    runFlow(editor, document).catch((error) => {
      vscode.window.showErrorMessage(
        `Failed to run flow: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  });

  context.subscriptions.push(runFlowCommand);
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

/**
 * フロー実行のメイン処理
 *
 * FlowRunnerを起動し、DecorationManagerを使ってエディタを更新する。
 *
 * @param editor - 対象のテキストエディタ
 * @param document - 対象のドキュメント
 */
async function runFlow(editor: vscode.TextEditor, document: vscode.TextDocument): Promise<void> {
  const filePath = document.fileName;
  const yamlContent = document.getText();

  // デコレーション管理を初期化
  let decorationManager: DecorationManager | null = null;
  const initResult = tryCreateDecorationManager(editor, yamlContent);
  initResult.match(
    (manager) => {
      decorationManager = manager;
    },
    (error) => {
      vscode.window.showErrorMessage(`Failed to initialize decorations: ${error.message}`);
      return;
    },
  );

  if (!decorationManager) {
    return;
  }

  // ワークスペースルートを取得
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }
  const workspaceRoot = workspaceFolder.uri.fsPath;

  // フローランナーを作成
  const runner = new FlowRunner(filePath, workspaceRoot);

  // 進捗イベントをデコレーションに反映
  runner.on('step:start', (message) => {
    decorationManager?.onStepStart(message);
  });

  runner.on('step:complete', (message) => {
    decorationManager?.onStepComplete(message);
  });

  runner.on('error', (error) => {
    vscode.window.showErrorMessage(`Flow execution error: ${error.message}`);
  });

  runner.on('flow:complete', (message) => {
    if (message.status === 'passed') {
      vscode.window.showInformationMessage(`Flow completed successfully in ${message.duration}ms`);
    } else {
      vscode.window.showErrorMessage(`Flow failed in ${message.duration}ms`);
    }
  });

  // フロー実行開始
  vscode.window.showInformationMessage(`Running flow: ${filePath}`);
  const exitCodeResult = await tryRunFlow(runner);

  exitCodeResult.match(
    (exitCode) => {
      if (exitCode === 0) {
        console.log('Flow completed successfully');
      } else {
        console.error(`Flow completed with exit code: ${exitCode}`);
      }
    },
    (error) => {
      vscode.window.showErrorMessage(`Failed to run flow: ${error.message}`);
      // エラー時はデコレーションをクリア
      decorationManager?.clear();
    },
  );
}

/**
 * DecorationManagerを作成する（Result型でラップ）
 *
 * @param editor - テキストエディタ
 * @param yamlContent - YAMLファイルの内容
 * @returns 成功時: DecorationManager、失敗時: Error
 */
function tryCreateDecorationManager(
  editor: vscode.TextEditor,
  yamlContent: string,
): { match: (ok: (m: DecorationManager) => void, err: (e: Error) => void) => void } {
  try {
    const manager = new DecorationManager(editor, yamlContent);
    return {
      match: (ok) => ok(manager),
    };
  } catch (error) {
    return {
      match: (_ok, err) => err(error instanceof Error ? error : new Error('Unknown error')),
    };
  }
}

/**
 * FlowRunnerを実行する（Result型でラップ）
 *
 * @param runner - FlowRunner
 * @returns 成功時: 終了コード、失敗時: Error
 */
async function tryRunFlow(
  runner: FlowRunner,
): Promise<{ match: (ok: (code: number) => void, err: (e: Error) => void) => void }> {
  try {
    const exitCode = await runner.run();
    return {
      match: (ok) => ok(exitCode),
    };
  } catch (error) {
    return {
      match: (_ok, err) => err(error instanceof Error ? error : new Error('Unknown error')),
    };
  }
}
