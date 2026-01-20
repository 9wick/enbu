/**
 * @packages/agent-browser-adapter
 *
 * agent-browser CLI との型安全な通信層を提供する。
 */

// ==========================================
// 新API: 型安全なブラウザ操作関数
// ==========================================

// ナビゲーション
export { browserOpen } from './commands/navigation';

// インタラクション
export {
  browserClick,
  browserType,
  browserFill,
  browserPress,
  browserHover,
  browserSelect,
  browserFocus,
} from './commands/interaction';

// スクロール
export { browserScroll, browserScrollIntoView } from './commands/scroll';

// 待機
export {
  browserWaitForMs,
  browserWaitForSelector,
  browserWaitForText,
  browserWaitForLoad,
  browserWaitForNetworkIdle,
  browserWaitForUrl,
  browserWaitForFunction,
} from './commands/wait';

// キャプチャ
export { browserScreenshot, browserSnapshot } from './commands/capture';

// JavaScript実行
export { browserEval } from './commands/eval';

// 状態チェック
export { browserIsVisible, browserIsEnabled, browserIsChecked } from './commands/is';

// セッション管理
export { browserClose } from './commands/session';

// ==========================================
// ユーティリティ関数
// ==========================================

export { checkAgentBrowser } from './check';

// ==========================================
// 型エクスポート
// ==========================================

export type {
  // エラー型
  AgentBrowserError,
  BrandValidationError,
  // 実行オプション
  ExecuteOptions,
  ScreenshotOptions,
  // Brand型
  Selector,
  Url,
  FilePath,
  KeyboardKey,
  JsExpression,
  // リテラル型
  ScrollDirection,
  LoadState,
  // 後方互換（将来削除予定）
  SnapshotRef,
  SnapshotRefs,
} from './types';

// Brand型ファクトリ関数
export {
  asSelector,
  asUrl,
  asFilePath,
  asKeyboardKey,
  asJsExpression,
} from './types';

// 出力型
export type {
  OpenData,
  EmptyData,
  ScreenshotData,
  SnapshotData,
  EvalData,
  IsVisibleData,
  IsEnabledData,
  IsCheckedData,
} from './schemas';
