/**
 * コマンド型定義
 *
 * 全てのコマンドを判別可能なユニオン型として定義する。
 * 各コマンドは共通の `command` フィールドで判別され、
 * コマンド固有のプロパティがフラットな構造で定義される。
 *
 * セレクタは css, ref, text, xpath のいずれか1つを明示的に指定する。
 * これによりDDDの「異なるドメイン概念を同じ型で扱わない」原則を満たす。
 *
 * 全てのフィールドはparser層で検証済みのBranded Typeを使用する。
 * executor層では再検証不要で、型安全に操作可能。
 */

import type {
  AnyTextSelector,
  CssSelector,
  FilePath,
  InteractableTextSelector,
  JsExpression,
  KeyboardKey,
  LoadState,
  RefSelector,
  ScrollDirection,
  Url,
  XpathSelector,
} from '@packages/agent-browser-adapter';
import type { UseDefault } from './utility-types';

// LoadStateをre-export（後方互換のため）
export type { LoadState } from '@packages/agent-browser-adapter';

// ==========================================
// セレクタ指定型（DDD準拠）
// ==========================================

/**
 * インタラクティブ要素用セレクタ指定
 *
 * click, fill, type, hover, select, assertEnabled, assertChecked で使用。
 * css, interactableText, xpath のいずれか1つのみを指定する。
 * interactableTextセレクタはsnapshot経由で@refに変換される。
 */
export type InteractableSelectorSpec =
  | { css: CssSelector; interactableText?: never; xpath?: never }
  | { css?: never; interactableText: InteractableTextSelector; xpath?: never }
  | { css?: never; interactableText?: never; xpath: XpathSelector };

/**
 * 全要素用セレクタ指定
 *
 * assertVisible, assertNotVisible, scrollIntoView で使用。
 * css, anyText, xpath のいずれか1つのみを指定する。
 * anyTextセレクタはtext=形式で直接処理される。
 */
export type AnySelectorSpec =
  | { css: CssSelector; anyText?: never; xpath?: never }
  | { css?: never; anyText: AnyTextSelector; xpath?: never }
  | { css?: never; anyText?: never; xpath: XpathSelector };

/**
 * セレクタ指定の共通型（後方互換用）
 * @deprecated 将来的にInteractableSelectorSpecまたはAnySelectorSpecを直接使用すること
 */
export type SelectorSpec = InteractableSelectorSpec | AnySelectorSpec;

/**
 * 解決済みセレクタ指定型（executor実行時）
 *
 * waitForSelectorで要素の存在を確認した後、CLIに渡すセレクタ。
 * - css/xpath: そのまま使用
 * - ref: interactableTextセレクタがsnapshotで解決された結果（@e1形式）
 * - anyText/interactableText: assertVisible/assertNotVisible/scrollIntoView用。
 *            browserWaitForTextで直接確認するため、anyText/interactableTextのまま保持する。
 */
export type ResolvedSelectorSpec =
  | { css: CssSelector; interactableText?: never; anyText?: never; xpath?: never; ref?: never }
  | {
      css?: never;
      interactableText: InteractableTextSelector;
      anyText?: never;
      xpath?: never;
      ref?: never;
    }
  | { css?: never; interactableText?: never; anyText: AnyTextSelector; xpath?: never; ref?: never }
  | { css?: never; interactableText?: never; anyText?: never; xpath: XpathSelector; ref?: never }
  | { css?: never; interactableText?: never; anyText?: never; xpath?: never; ref: RefSelector };

/**
 * 未検証のセレクタ指定型（YAMLパース直後）
 */
export type RawSelectorSpec =
  | { css: string; interactableText?: never; anyText?: never; xpath?: never }
  | { css?: never; interactableText: string; anyText?: never; xpath?: never }
  | { css?: never; interactableText?: never; anyText: string; xpath?: never }
  | { css?: never; interactableText?: never; anyText?: never; xpath: string };

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
 * //     InteractableText: "ログイン"
 * { command: 'click', InteractableText: 'ログイン' }
 */
export type ClickCommand = {
  command: 'click';
} & InteractableSelectorSpec;

/**
 * 要素をダブルクリック
 *
 * @example
 * // YAML:
 * // - dblclick:
 * //     css: "#edit-button"
 * { command: 'dblclick', css: '#edit-button' }
 *
 * @example
 * // YAML:
 * // - dblclick:
 * //     interactableText: "編集"
 * { command: 'dblclick', interactableText: '編集' }
 */
export type DblclickCommand = {
  command: 'dblclick';
} & InteractableSelectorSpec;

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
} & InteractableSelectorSpec;

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
} & InteractableSelectorSpec;

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
 * キーボードキーを押下する（押したまま）
 *
 * @example
 * // YAML: - keydown: Shift
 * { command: 'keydown', key: 'Shift' }
 */
export type KeydownCommand = {
  command: 'keydown';
  key: KeyboardKey;
};

/**
 * キーボードキーを離す
 *
 * @example
 * // YAML: - keyup: Shift
 * { command: 'keyup', key: 'Shift' }
 */
export type KeyupCommand = {
  command: 'keyup';
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
} & InteractableSelectorSpec;

/**
 * 要素にフォーカス
 *
 * @example
 * // YAML:
 * // - focus:
 * //     css: "#email"
 * { command: 'focus', css: '#email' }
 *
 * @example
 * // YAML:
 * // - focus:
 * //     interactableText: "入力欄ラベル"
 * { command: 'focus', interactableText: '入力欄ラベル' }
 */
export type FocusCommand = {
  command: 'focus';
} & InteractableSelectorSpec;

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
} & InteractableSelectorSpec;

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
} & AnySelectorSpec;

/**
 * 待機コマンド
 *
 * agent-browserのwaitコマンドと1:1対応:
 * - ms: 指定ミリ秒待機 (wait <ms>)
 * - css/xpath: CSSセレクタまたはXPathで要素出現を待つ (wait <selector>)
 * - AnyText: テキスト出現を待つ (wait --text <text>)
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
} & (
  | { ms: number }
  | { css: CssSelector; xpath?: never; anyText?: never }
  | { css?: never; xpath: XpathSelector; anyText?: never }
  | { css?: never; xpath?: never; anyText: AnyTextSelector }
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
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: FilePath;
  /** ページ全体のスクリーンショットを撮影。未指定時はUseDefaultを設定。 */
  full: boolean | UseDefault;
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
} & AnySelectorSpec;

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
} & AnySelectorSpec;

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
} & InteractableSelectorSpec;

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
} & InteractableSelectorSpec;

/**
 * チェックボックスをチェックする
 *
 * @example
 * // YAML: - check: "利用規約に同意する"
 * { command: 'check', interactableText: '利用規約に同意する' }
 *
 * @example
 * // YAML:
 * // - check:
 * //     css: "#agree-terms"
 * { command: 'check', css: '#agree-terms' }
 */
export type CheckCommand = {
  command: 'check';
} & InteractableSelectorSpec;

/**
 * チェックボックスのチェックを外す
 *
 * @example
 * // YAML: - uncheck: "メール配信を希望する"
 * { command: 'uncheck', interactableText: 'メール配信を希望する' }
 *
 * @example
 * // YAML:
 * // - uncheck:
 * //     css: "#newsletter"
 * { command: 'uncheck', css: '#newsletter' }
 */
export type UncheckCommand = {
  command: 'uncheck';
} & InteractableSelectorSpec;

/**
 * 全てのコマンド型のユニオン
 */
export type Command =
  | OpenCommand
  | ClickCommand
  | DblclickCommand
  | TypeCommand
  | FillCommand
  | PressCommand
  | KeydownCommand
  | KeyupCommand
  | HoverCommand
  | FocusCommand
  | SelectCommand
  | ScrollCommand
  | ScrollIntoViewCommand
  | WaitCommand
  | ScreenshotCommand
  | EvalCommand
  | AssertVisibleCommand
  | AssertNotVisibleCommand
  | AssertEnabledCommand
  | AssertCheckedCommand
  | CheckCommand
  | UncheckCommand;

// ==========================================
// 解決済みコマンド型定義（executor実行時）
// SelectorSpecがResolvedSelectorSpecに変換されたもの
// ==========================================

/** 解決済みClickCommand */
export type ResolvedClickCommand = {
  command: 'click';
} & ResolvedSelectorSpec;

/** 解決済みDblclickCommand */
export type ResolvedDblclickCommand = {
  command: 'dblclick';
} & ResolvedSelectorSpec;

/** 解決済みTypeCommand */
export type ResolvedTypeCommand = {
  command: 'type';
  value: string;
} & ResolvedSelectorSpec;

/** 解決済みFillCommand */
export type ResolvedFillCommand = {
  command: 'fill';
  value: string;
} & ResolvedSelectorSpec;

/** 解決済みHoverCommand */
export type ResolvedHoverCommand = {
  command: 'hover';
} & ResolvedSelectorSpec;

/** 解決済みFocusCommand */
export type ResolvedFocusCommand = {
  command: 'focus';
} & ResolvedSelectorSpec;

/** 解決済みSelectCommand */
export type ResolvedSelectCommand = {
  command: 'select';
  value: string;
} & ResolvedSelectorSpec;

/** 解決済みScrollIntoViewCommand */
export type ResolvedScrollIntoViewCommand = {
  command: 'scrollIntoView';
} & ResolvedSelectorSpec;

/** 解決済みAssertVisibleCommand */
export type ResolvedAssertVisibleCommand = {
  command: 'assertVisible';
} & ResolvedSelectorSpec;

/** 解決済みAssertNotVisibleCommand */
export type ResolvedAssertNotVisibleCommand = {
  command: 'assertNotVisible';
} & ResolvedSelectorSpec;

/** 解決済みAssertEnabledCommand */
export type ResolvedAssertEnabledCommand = {
  command: 'assertEnabled';
} & ResolvedSelectorSpec;

/** 解決済みAssertCheckedCommand */
export type ResolvedAssertCheckedCommand = {
  command: 'assertChecked';
  /** 期待されるチェック状態。未指定時はUseDefaultを設定。 */
  checked: boolean | UseDefault;
} & ResolvedSelectorSpec;

/** 解決済みCheckCommand */
export type ResolvedCheckCommand = {
  command: 'check';
} & ResolvedSelectorSpec;

/** 解決済みUncheckCommand */
export type ResolvedUncheckCommand = {
  command: 'uncheck';
} & ResolvedSelectorSpec;

/**
 * 解決済みコマンド型のユニオン
 *
 * executor層でコマンドハンドラに渡される型。
 * セレクタを持つコマンドはResolvedSelectorSpecを使用。
 * セレクタを持たないコマンド（open, press, keydown, keyup, scroll, wait, screenshot, eval）は
 * そのまま使用される。
 */
export type ResolvedCommand =
  | OpenCommand
  | ResolvedClickCommand
  | ResolvedDblclickCommand
  | ResolvedTypeCommand
  | ResolvedFillCommand
  | PressCommand
  | KeydownCommand
  | KeyupCommand
  | ResolvedHoverCommand
  | ResolvedFocusCommand
  | ResolvedSelectCommand
  | ScrollCommand
  | ResolvedScrollIntoViewCommand
  | WaitCommand
  | ScreenshotCommand
  | EvalCommand
  | ResolvedAssertVisibleCommand
  | ResolvedAssertNotVisibleCommand
  | ResolvedAssertEnabledCommand
  | ResolvedAssertCheckedCommand
  | ResolvedCheckCommand
  | ResolvedUncheckCommand;

// ==========================================
// Raw型定義（YAMLパース直後の未検証型）
// parser層でvalidation後にBranded型に変換される
// ==========================================

/** 未検証のOpenCommand */
export type RawOpenCommand = {
  command: 'open';
  url: string;
};

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
} & (
  | { ms: number }
  | { css: string }
  | { xpath: string }
  | { AnyText: string }
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
 * 未検証コマンド型のユニオン
 *
 * YAMLパース後、Branded Type検証前の状態を表す。
 * command-validatorでBranded Typeに変換される。
 *
 * 注意: Clickはvalibotスキーマから導出されるため、
 * parser層のraw-command.tsで定義されたRawCommandを使用すること。
 * この型は後方互換のためにtypes層に残しているが、
 * 将来的に全コマンドがスキーマ化された際に削除予定。
 */
export type RawCommand =
  | RawOpenCommand
  | RawTypeCommand
  | RawFillCommand
  | RawPressCommand
  | RawHoverCommand
  | RawSelectCommand
  | RawScrollCommand
  | RawScrollIntoViewCommand
  | RawWaitCommand
  | RawScreenshotCommand
  | RawEvalCommand
  | RawAssertVisibleCommand
  | RawAssertNotVisibleCommand
  | RawAssertEnabledCommand
  | RawAssertCheckedCommand;
