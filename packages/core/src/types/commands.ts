/**
 * コマンド型定義
 *
 * 全てのコマンドを判別可能なユニオン型として定義する。
 * 各コマンドは共通の `command` フィールドで判別され、
 * コマンド固有のプロパティがフラットな構造で定義される。
 *
 * 全てのフィールドはparser層で検証済みのBranded Typeを使用する。
 * executor層では再検証不要で、型安全に操作可能。
 */

import type {
  FilePath,
  JsExpression,
  KeyboardKey,
  LoadState,
  ScrollDirection,
  Selector,
  Url,
} from '@packages/agent-browser-adapter';
import type { UseDefault } from './utility-types';

// LoadState, ScrollDirectionをre-export（後方互換のため）
export type { LoadState, ScrollDirection } from '@packages/agent-browser-adapter';

/**
 * ページを開く
 *
 * @example
 * // YAML: - open: https://example.com
 * { command: 'open', url: 'https://example.com' }
 */
export type OpenCommand = {
  command: 'open';
  url: Url;
};

/**
 * 要素をクリック
 *
 * @example
 * // YAML: - click: "ログインボタン"
 * { command: 'click', selector: 'ログインボタン' }
 */
export type ClickCommand = {
  command: 'click';
  selector: Selector;
};

/**
 * テキストを入力（既存のテキストをクリアしない）
 *
 * @example
 * // YAML:
 * // - type:
 * //     selector: "検索欄"
 * //     value: "検索キーワード"
 * { command: 'type', selector: '検索欄', value: '検索キーワード' }
 */
export type TypeCommand = {
  command: 'type';
  selector: Selector;
  value: string;
};

/**
 * フォームにテキストを入力（既存のテキストをクリア）
 *
 * @example
 * // YAML:
 * // - fill:
 * //     selector: "メールアドレス"
 * //     value: "${EMAIL}"
 * { command: 'fill', selector: 'メールアドレス', value: 'user@example.com' }
 */
export type FillCommand = {
  command: 'fill';
  selector: Selector;
  value: string;
};

/**
 * キーボードキーを押す
 *
 * @example
 * // YAML: - press: Enter
 * { command: 'press', key: 'Enter' }
 */
export type PressCommand = {
  command: 'press';
  key: KeyboardKey;
};

/**
 * 要素にホバー
 *
 * @example
 * // YAML: - hover: "メニュー項目"
 * { command: 'hover', selector: 'メニュー項目' }
 */
export type HoverCommand = {
  command: 'hover';
  selector: Selector;
};

/**
 * セレクトボックスから選択
 *
 * @example
 * // YAML:
 * // - select:
 * //     selector: "国選択"
 * //     value: "日本"
 * { command: 'select', selector: '国選択', value: '日本' }
 */
export type SelectCommand = {
  command: 'select';
  selector: Selector;
  value: string;
};

/**
 * ページをスクロール
 *
 * @example
 * // YAML:
 * // - scroll:
 * //     direction: down
 * //     amount: 500
 * { command: 'scroll', direction: 'down', amount: 500 }
 */
export type ScrollCommand = {
  command: 'scroll';
  direction: ScrollDirection;
  amount: number;
};

/**
 * 要素をビューにスクロール
 *
 * @example
 * // YAML: - scrollIntoView: "フッター"
 * { command: 'scrollIntoView', selector: 'フッター' }
 */
export type ScrollIntoViewCommand = {
  command: 'scrollIntoView';
  selector: Selector;
};

/**
 * 待機コマンド
 *
 * agent-browserのwaitコマンドと1:1対応:
 * - ms: 指定ミリ秒待機 (wait <ms>)
 * - selector: CSSセレクタで要素出現を待つ (wait <selector>)
 * - text: テキスト出現を待つ (wait --text <text>)
 * - load: ロード状態を待つ (wait --load <state>)
 * - url: URL変化を待つ (wait --url <pattern>)
 * - fn: JS式がtruthyになるのを待つ (wait --fn <expression>)
 *
 * @example
 * // YAML: - wait: 1000
 * { command: 'wait', ms: 1000 }
 *
 * @example
 * // YAML: - wait: "#loading-spinner"
 * { command: 'wait', selector: '#loading-spinner' }
 *
 * @example
 * // YAML:
 * // - wait:
 * //     text: "読み込み完了"
 * { command: 'wait', text: '読み込み完了' }
 *
 * @example
 * // YAML:
 * // - wait:
 * //     load: networkidle
 * { command: 'wait', load: 'networkidle' }
 *
 * @example
 * // YAML形式:
 * // - wait:
 * //     url: pattern
 * // TypeScript形式: { command: 'wait', url: pattern }
 *
 * @example
 * // YAML形式:
 * // - wait:
 * //     fn: expression
 * // TypeScript形式: { command: 'wait', fn: expression }
 */
export type WaitCommand = {
  command: 'wait';
} & (
  | { ms: number }
  | { selector: Selector }
  | { text: string }
  | { load: LoadState }
  | { url: string }
  | { fn: JsExpression }
);

/**
 * スクリーンショットを保存
 *
 * @example
 * // YAML: - screenshot: ./result.png
 * { command: 'screenshot', path: './result.png' }
 *
 * @example
 * // YAML:
 * // - screenshot:
 * //     path: ./result.png
 * //     full: true
 * { command: 'screenshot', path: './result.png', full: true }
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: FilePath;
  /** ページ全体のスクリーンショットを撮影。未指定時はUseDefaultを設定。agent-browserの--fullオプションに対応。 */
  full: boolean | UseDefault;
};

/**
 * ページの構造をスナップショット
 *
 * @example
 * // YAML: - snapshot: {}
 * { command: 'snapshot' }
 */
export type SnapshotCommand = {
  command: 'snapshot';
};

/**
 * JavaScriptを実行
 *
 * @example
 * // YAML: - eval: "document.title"
 * { command: 'eval', script: 'document.title' }
 */
export type EvalCommand = {
  command: 'eval';
  script: JsExpression;
};

/**
 * 要素が表示されていることを確認
 *
 * @example
 * // YAML: - assertVisible: "ダッシュボード"
 * { command: 'assertVisible', selector: 'ダッシュボード' }
 */
export type AssertVisibleCommand = {
  command: 'assertVisible';
  selector: Selector;
};

/**
 * 要素が表示されていないことを確認
 *
 * @example
 * // YAML: - assertNotVisible: "エラーメッセージ"
 * { command: 'assertNotVisible', selector: 'エラーメッセージ' }
 */
export type AssertNotVisibleCommand = {
  command: 'assertNotVisible';
  selector: Selector;
};

/**
 * 要素が有効化されていることを確認
 *
 * @example
 * // YAML: - assertEnabled: "送信ボタン"
 * { command: 'assertEnabled', selector: '送信ボタン' }
 */
export type AssertEnabledCommand = {
  command: 'assertEnabled';
  selector: Selector;
};

/**
 * チェックボックスがチェックされていることを確認
 *
 * @example
 * // YAML: - assertChecked: "利用規約に同意"
 * { command: 'assertChecked', selector: '利用規約に同意' }
 *
 * @example
 * // YAML:
 * // - assertChecked:
 * //     selector: "利用規約に同意"
 * //     checked: false
 * { command: 'assertChecked', selector: '利用規約に同意', checked: false }
 */
export type AssertCheckedCommand = {
  command: 'assertChecked';
  selector: Selector;
  /** 期待されるチェック状態。未指定時はUseDefaultを設定。 */
  checked: boolean | UseDefault;
};

/**
 * 全てのコマンド型のユニオン
 */
export type Command =
  | OpenCommand
  | ClickCommand
  | TypeCommand
  | FillCommand
  | PressCommand
  | HoverCommand
  | SelectCommand
  | ScrollCommand
  | ScrollIntoViewCommand
  | WaitCommand
  | ScreenshotCommand
  | SnapshotCommand
  | EvalCommand
  | AssertVisibleCommand
  | AssertNotVisibleCommand
  | AssertEnabledCommand
  | AssertCheckedCommand;

// ==========================================
// Raw型定義（YAMLパース直後の未検証型）
// parser層でvalidation後にBranded型に変換される
// ==========================================

/** 未検証のOpenCommand */
export type RawOpenCommand = {
  command: 'open';
  url: string;
};

/** 未検証のClickCommand */
export type RawClickCommand = {
  command: 'click';
  selector: string;
};

/** 未検証のTypeCommand */
export type RawTypeCommand = {
  command: 'type';
  selector: string;
  value: string;
};

/** 未検証のFillCommand */
export type RawFillCommand = {
  command: 'fill';
  selector: string;
  value: string;
};

/** 未検証のPressCommand */
export type RawPressCommand = {
  command: 'press';
  key: string;
};

/** 未検証のHoverCommand */
export type RawHoverCommand = {
  command: 'hover';
  selector: string;
};

/** 未検証のSelectCommand */
export type RawSelectCommand = {
  command: 'select';
  selector: string;
  value: string;
};

/** 未検証のScrollCommand */
export type RawScrollCommand = {
  command: 'scroll';
  direction: 'up' | 'down' | 'left' | 'right';
  amount: number;
};

/** 未検証のScrollIntoViewCommand */
export type RawScrollIntoViewCommand = {
  command: 'scrollIntoView';
  selector: string;
};

/** 未検証のWaitCommand */
export type RawWaitCommand = {
  command: 'wait';
} & (
  | { ms: number }
  | { selector: string }
  | { text: string }
  | { load: LoadState }
  | { url: string }
  | { fn: string }
);

/** 未検証のScreenshotCommand */
export type RawScreenshotCommand = {
  command: 'screenshot';
  path: string;
  full: boolean | UseDefault;
};

/** 未検証のSnapshotCommand */
export type RawSnapshotCommand = {
  command: 'snapshot';
};

/** 未検証のEvalCommand */
export type RawEvalCommand = {
  command: 'eval';
  script: string;
};

/** 未検証のAssertVisibleCommand */
export type RawAssertVisibleCommand = {
  command: 'assertVisible';
  selector: string;
};

/** 未検証のAssertNotVisibleCommand */
export type RawAssertNotVisibleCommand = {
  command: 'assertNotVisible';
  selector: string;
};

/** 未検証のAssertEnabledCommand */
export type RawAssertEnabledCommand = {
  command: 'assertEnabled';
  selector: string;
};

/** 未検証のAssertCheckedCommand */
export type RawAssertCheckedCommand = {
  command: 'assertChecked';
  selector: string;
  checked: boolean | UseDefault;
};

/**
 * 未検証コマンド型のユニオン（parser層で使用）
 *
 * YAMLパース後、Branded Type検証前の状態を表す。
 * command-validatorでBranded Typeに変換される。
 */
export type RawCommand =
  | RawOpenCommand
  | RawClickCommand
  | RawTypeCommand
  | RawFillCommand
  | RawPressCommand
  | RawHoverCommand
  | RawSelectCommand
  | RawScrollCommand
  | RawScrollIntoViewCommand
  | RawWaitCommand
  | RawScreenshotCommand
  | RawSnapshotCommand
  | RawEvalCommand
  | RawAssertVisibleCommand
  | RawAssertNotVisibleCommand
  | RawAssertEnabledCommand
  | RawAssertCheckedCommand;
