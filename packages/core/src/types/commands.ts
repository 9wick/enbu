/**
 * コマンド型定義
 *
 * 全てのコマンドを判別可能なユニオン型として定義する。
 * 各コマンドは共通の `command` フィールドで判別され、
 * コマンド固有のプロパティがフラットな構造で定義される。
 *
 * セレクタは css, ref, text のいずれか1つを明示的に指定する。
 * これによりDDDの「異なるドメイン概念を同じ型で扱わない」原則を満たす。
 *
 * 全てのフィールドはparser層で検証済みのBranded Typeを使用する。
 * executor層では再検証不要で、型安全に操作可能。
 */

import type {
  CssSelector,
  FilePath,
  JsExpression,
  KeyboardKey,
  LoadState,
  RefSelector,
  ScrollDirection,
  TextSelector,
  Url,
} from '@packages/agent-browser-adapter';
import type { UseDefault } from './utility-types';

// LoadStateをre-export（後方互換のため）
export type { LoadState } from '@packages/agent-browser-adapter';

// ==========================================
// セレクタ指定型（DDD準拠）
// ==========================================

/**
 * セレクタ指定の共通型
 *
 * css, ref, text のいずれか1つのみを指定する。
 * これにより「CSSセレクタ」「Ref参照」「テキスト検索」という
 * 異なるドメイン概念を型で明確に分離する。
 */

export type SelectorSpec =
  | { css: CssSelector; ref?: never; text?: never }
  | { css?: never; ref: RefSelector; text?: never }
  | { css?: never; ref?: never; text: TextSelector };

/**
 * 未検証のセレクタ指定型（YAMLパース直後）
 */

export type RawSelectorSpec =
  | { css: string; ref?: never; text?: never }
  | { css?: never; ref: string; text?: never }
  | { css?: never; ref?: never; text: string };

// ==========================================
// コマンド型定義
// ==========================================

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
 * // YAML:
 * // - click:
 * //     css: "#login-button"
 * { command: 'click', css: '#login-button' }
 *
 * @example
 * // YAML:
 * // - click:
 * //     text: "ログイン"
 * { command: 'click', text: 'ログイン' }
 */
export type ClickCommand = {
  command: 'click';
} & SelectorSpec;

/**
 * テキストを入力（既存のテキストをクリアしない）
 *
 * @example
 * // YAML:
 * // - type:
 * //     css: "#search"
 * //     value: "検索キーワード"
 * { command: 'type', css: '#search', value: '検索キーワード' }
 */
export type TypeCommand = {
  command: 'type';
  value: string;
} & SelectorSpec;

/**
 * フォームにテキストを入力（既存のテキストをクリア）
 *
 * @example
 * // YAML:
 * // - fill:
 * //     css: "#email"
 * //     value: "${EMAIL}"
 * { command: 'fill', css: '#email', value: 'user@example.com' }
 */
export type FillCommand = {
  command: 'fill';
  value: string;
} & SelectorSpec;

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
 * // YAML:
 * // - hover:
 * //     css: ".menu-item"
 * { command: 'hover', css: '.menu-item' }
 */
export type HoverCommand = {
  command: 'hover';
} & SelectorSpec;

/**
 * セレクトボックスから選択
 *
 * @example
 * // YAML:
 * // - select:
 * //     css: "#country"
 * //     value: "日本"
 * { command: 'select', css: '#country', value: '日本' }
 */
export type SelectCommand = {
  command: 'select';
  value: string;
} & SelectorSpec;

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
 * // YAML:
 * // - scrollIntoView:
 * //     css: "#footer"
 * { command: 'scrollIntoView', css: '#footer' }
 */
export type ScrollIntoViewCommand = {
  command: 'scrollIntoView';
} & SelectorSpec;

/**
 * 待機コマンド
 *
 * agent-browserのwaitコマンドと1:1対応:
 * - ms: 指定ミリ秒待機 (wait <ms>)
 * - css/ref: CSSセレクタまたはRefで要素出現を待つ (wait <selector>)
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
 * // YAML:
 * // - wait:
 * //     css: "#loading-spinner"
 * { command: 'wait', css: '#loading-spinner' }
 */
export type WaitCommand = {
  command: 'wait';
} & ({ ms: number } | SelectorSpec | { load: LoadState } | { url: string } | { fn: JsExpression });

/**
 * スクリーンショットを保存
 *
 * @example
 * // YAML: - screenshot: ./result.png
 * { command: 'screenshot', path: './result.png' }
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: FilePath;
  /** ページ全体のスクリーンショットを撮影。未指定時はUseDefaultを設定。 */
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
 * // YAML:
 * // - assertVisible:
 * //     css: "#dashboard"
 * { command: 'assertVisible', css: '#dashboard' }
 */
export type AssertVisibleCommand = {
  command: 'assertVisible';
} & SelectorSpec;

/**
 * 要素が表示されていないことを確認
 *
 * @example
 * // YAML:
 * // - assertNotVisible:
 * //     css: ".error-message"
 * { command: 'assertNotVisible', css: '.error-message' }
 */
export type AssertNotVisibleCommand = {
  command: 'assertNotVisible';
} & SelectorSpec;

/**
 * 要素が有効化されていることを確認
 *
 * @example
 * // YAML:
 * // - assertEnabled:
 * //     css: "#submit-button"
 * { command: 'assertEnabled', css: '#submit-button' }
 */
export type AssertEnabledCommand = {
  command: 'assertEnabled';
} & SelectorSpec;

/**
 * チェックボックスがチェックされていることを確認
 *
 * @example
 * // YAML:
 * // - assertChecked:
 * //     css: "#agree-terms"
 * { command: 'assertChecked', css: '#agree-terms' }
 *
 * @example
 * // YAML:
 * // - assertChecked:
 * //     css: "#agree-terms"
 * //     checked: false
 * { command: 'assertChecked', css: '#agree-terms', checked: false }
 */
export type AssertCheckedCommand = {
  command: 'assertChecked';
  /** 期待されるチェック状態。未指定時はUseDefaultを設定。 */
  checked: boolean | UseDefault;
} & SelectorSpec;

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
} & RawSelectorSpec;

/** 未検証のTypeCommand */
export type RawTypeCommand = {
  command: 'type';
  value: string;
} & RawSelectorSpec;

/** 未検証のFillCommand */
export type RawFillCommand = {
  command: 'fill';
  value: string;
} & RawSelectorSpec;

/** 未検証のPressCommand */
export type RawPressCommand = {
  command: 'press';
  key: string;
};

/** 未検証のHoverCommand */
export type RawHoverCommand = {
  command: 'hover';
} & RawSelectorSpec;

/** 未検証のSelectCommand */
export type RawSelectCommand = {
  command: 'select';
  value: string;
} & RawSelectorSpec;

/** 未検証のScrollCommand */
export type RawScrollCommand = {
  command: 'scroll';
  direction: 'up' | 'down' | 'left' | 'right';
  amount: number;
};

/** 未検証のScrollIntoViewCommand */
export type RawScrollIntoViewCommand = {
  command: 'scrollIntoView';
} & RawSelectorSpec;

/** 未検証のWaitCommand */
export type RawWaitCommand = {
  command: 'wait';
} & ({ ms: number } | RawSelectorSpec | { load: LoadState } | { url: string } | { fn: string });

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
} & RawSelectorSpec;

/** 未検証のAssertNotVisibleCommand */
export type RawAssertNotVisibleCommand = {
  command: 'assertNotVisible';
} & RawSelectorSpec;

/** 未検証のAssertEnabledCommand */
export type RawAssertEnabledCommand = {
  command: 'assertEnabled';
} & RawSelectorSpec;

/** 未検証のAssertCheckedCommand */
export type RawAssertCheckedCommand = {
  command: 'assertChecked';
  checked: boolean | UseDefault;
} & RawSelectorSpec;

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
