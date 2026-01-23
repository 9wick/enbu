/**
 * executeStep フロー解析用エントリーポイント
 *
 * madori の型 Narrowing 機能を活用して、
 * 特定のコマンド型に絞ったデータフローを可視化するためのエントリーポイント。
 *
 * 使用方法:
 *   pnpm tsx packages/core/src/analyze-type-flow.ts analyzeClickStep --json --project=/workspaces/enbu
 *   pnpm tsx packages/core/src/analyze-type-flow.ts analyzeOpenStep --json --project=/workspaces/enbu
 *   pnpm tsx packages/core/src/analyze-type-flow.ts analyzeFillStep --json --project=/workspaces/enbu
 */

import type { ClickCommand, FillCommand, OpenCommand } from '../types';
import type { ExecutionContext } from './result';
import { executeStep } from './execute-step';

/**
 * 解析用のダミーコンテキスト
 * 実行はされないため、型情報のみが重要
 */
declare const mockContext: ExecutionContext;

/**
 * ダミーコマンドの宣言
 * 実行はされないため、型情報のみが重要
 */
declare const clickCommand: ClickCommand;
declare const openCommand: OpenCommand;
declare const fillCommand: FillCommand;

/**
 * Click コマンドのフロー解析用エントリーポイント
 *
 * executeStep に ClickCommand を渡した場合のデータフローを解析する。
 * ts-pattern の match で click 分岐のみが展開される。
 */
export function analyzeClickStep() {
  return executeStep(clickCommand, 0, mockContext, false);
}

/**
 * Open コマンドのフロー解析用エントリーポイント
 *
 * executeStep に OpenCommand を渡した場合のデータフローを解析する。
 * ts-pattern の match で open 分岐のみが展開される。
 */
export function analyzeOpenStep() {
  return executeStep(openCommand, 0, mockContext, false);
}

/**
 * Fill コマンドのフロー解析用エントリーポイント
 *
 * executeStep に FillCommand を渡した場合のデータフローを解析する。
 * ts-pattern の match で fill 分岐のみが展開される。
 */
export function analyzeFillStep() {
  return executeStep(fillCommand, 0, mockContext, false);
}
