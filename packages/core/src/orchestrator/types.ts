/**
 * オーケストレーター層の型定義
 *
 * フロー実行パイプライン全体を管理するための型を提供する。
 *
 * @remarks
 * このモジュールはアプリケーション層（CLI、VS Code拡張など）への公開APIであるため、
 * optional property（?:）を使用してユーザビリティを向上させている。
 * ドメイン層の厳密なルールは適用されない（eslint.config.mjsで除外設定済み）。
 */

import type { StepProgressCallback, StepResult } from '../executor';

/**
 * フロー実行のサマリー情報
 *
 * 単一フローの実行結果を表す。
 */
export type FlowRunSummary = {
  /** フロー名（ファイル名から取得） */
  flowName: string;
  /** 実行結果のステータス */
  status: 'passed' | 'failed';
  /** 実行時間（ミリ秒） */
  duration: number;
  /** 各ステップの実行結果 */
  steps: StepResult[];
  /** エラー情報（失敗時のみ） */
  error?: {
    /** 失敗したステップのインデックス */
    stepIndex: number;
    /** エラーメッセージ */
    message: string;
    /** スクリーンショットのパス（撮影された場合のみ） */
    screenshot?: string;
  };
};

/**
 * フロー進捗コールバックの型定義
 *
 * フローの開始・完了時に呼び出されるコールバック。
 */
export type FlowProgressCallback = (
  progress:
    | { type: 'flow:start'; flowName: string; stepTotal: number }
    | { type: 'flow:complete'; flowName: string; status: 'passed' | 'failed'; duration: number },
) => void | Promise<void>;

/**
 * runFlows関数の入力型
 *
 * フロー実行パイプラインに渡すオプションを表す。
 */
export type RunFlowsInput = {
  /** ファイルパスまたはglobパターンの配列（空の場合は.enbuflow/*.enbu.yamlを検索） */
  files: string[];
  /** ファイル解決の基準となる作業ディレクトリ */
  cwd: string;
  /** ヘッドモードで実行するか（デフォルト: false） */
  headed?: boolean;
  /** 渡す環境変数（デフォルト: {}） */
  env?: Record<string, string>;
  /** コマンドタイムアウト時間（ミリ秒、デフォルト: 30000） */
  commandTimeoutMs?: number;
  /** 自動待機タイムアウト時間（ミリ秒、デフォルト: 30000） */
  autoWaitTimeoutMs?: number;
  /** 自動待機の間隔（ミリ秒、デフォルト: 100） */
  autoWaitIntervalMs?: number;
  /** 失敗時にスクリーンショットを撮影するか（デフォルト: true） */
  screenshot?: boolean;
  /** 最初の失敗で停止するか（デフォルト: true） */
  bail?: boolean;
  /** 並列実行数（デフォルト: 1 = 順次実行） */
  parallel?: number;
  /** ステップ進捗コールバック */
  onStepProgress?: StepProgressCallback;
  /** フロー進捗コールバック */
  onFlowProgress?: FlowProgressCallback;
};

/**
 * runFlows関数の出力型
 *
 * フロー実行パイプラインの実行結果を表す。
 */
export type RunFlowsOutput = {
  /** 成功したフローの数 */
  passed: number;
  /** 失敗したフローの数 */
  failed: number;
  /** 総フロー数 */
  total: number;
  /** 総実行時間（ミリ秒） */
  duration: number;
  /** 各フローの実行結果 */
  flows: FlowRunSummary[];
};

/**
 * オーケストレーター層のエラー型
 *
 * フロー実行パイプラインで発生するエラーを表す。
 */
export type OrchestratorError =
  | {
      /** エラー種別: 環境エラー */
      type: 'environment_error';
      /** エラーメッセージ */
      message: string;
    }
  | {
      /** エラー種別: フローが見つからない */
      type: 'no_flows_found';
      /** エラーメッセージ */
      message: string;
    }
  | {
      /** エラー種別: ロードエラー */
      type: 'load_error';
      /** エラーメッセージ */
      message: string;
      /** エラーが発生したファイルパス */
      filePath: string;
    }
  | {
      /** エラー種別: 実行エラー */
      type: 'execution_error';
      /** エラーメッセージ */
      message: string;
      /** エラーが発生したフロー名 */
      flowName: string;
    };
