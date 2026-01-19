/**
 * browser* コマンド関数のエクスポート
 *
 * 全ての型安全なブラウザ操作関数をここから再エクスポートする。
 */

// ナビゲーション
export { browserOpen } from './navigation';

// インタラクション
export {
  browserClick,
  browserType,
  browserFill,
  browserPress,
  browserHover,
  browserSelect,
  browserFocus,
} from './interaction';

// スクロール
export { browserScroll, browserScrollIntoView } from './scroll';

// 待機
export {
  browserWaitForMs,
  browserWaitForSelector,
  browserWaitForText,
  browserWaitForLoad,
  browserWaitForNetworkIdle,
  browserWaitForUrl,
  browserWaitForFunction,
} from './wait';

// キャプチャ
export { browserScreenshot, browserSnapshot } from './capture';

// JavaScript実行
export { browserEval } from './eval';

// 状態チェック
export { browserIsVisible, browserIsEnabled, browserIsChecked } from './is';

// セッション管理
export { browserClose } from './session';
