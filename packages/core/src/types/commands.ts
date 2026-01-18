/**
 * コマンド型定義
 *
 * 全てのコマンドを判別可能なユニオン型として定義する。
 * 各コマンドは共通の `command` フィールドで判別され、
 * コマンド固有のプロパティがフラットな構造で定義される。
 */

/**
 * ページを開く
 *
 * @example
 * // YAML: - open: https://example.com
 * { command: 'open', url: 'https://example.com' }
 */
export type OpenCommand = {
  command: 'open';
  url: string;
};

/**
 * 要素をクリック
 *
 * @example
 * // YAML: - click: "ログインボタン"
 * { command: 'click', selector: 'ログインボタン' }
 *
 * @example
 * // YAML:
 * // - click:
 * //     selector: "ログインボタン"
 * //     index: 2
 * { command: 'click', selector: 'ログインボタン', index: 2 }
 */
export type ClickCommand = {
  command: 'click';
  selector: string;
  /** 同名要素が複数ある場合のインデックス指定（0始まり） */
  index?: number;
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
 *
 * @example
 * // YAML:
 * // - type:
 * //     selector: "検索欄"
 * //     value: "検索キーワード"
 * //     clear: true
 * { command: 'type', selector: '検索欄', value: '検索キーワード', clear: true }
 */
export type TypeCommand = {
  command: 'type';
  selector: string;
  value: string;
  /** 入力前に既存のテキストをクリアするか */
  clear?: boolean;
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
  selector: string;
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
  key: string;
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
  selector: string;
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
  selector: string;
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
  direction: 'up' | 'down' | 'left' | 'right';
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
  selector: string;
};

/**
 * ロード状態の種類
 *
 * agent-browserのwait --loadオプションで指定可能な状態:
 * - load: DOMContentLoadedとonloadイベントが発火した状態
 * - domcontentloaded: DOMが完全に読み込まれて解析された状態
 * - networkidle: ネットワークアイドル状態（少なくとも500ms間、アクティブな接続が2つ以下）
 */
export type LoadState = 'load' | 'domcontentloaded' | 'networkidle';

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
  | { selector: string }
  | { text: string }
  | { load: LoadState }
  | { url: string }
  | { fn: string }
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
 * //     fullPage: true
 * { command: 'screenshot', path: './result.png', fullPage: true }
 */
export type ScreenshotCommand = {
  command: 'screenshot';
  path: string;
  /** ページ全体のスクリーンショットを撮影（デフォルト: false） */
  fullPage?: boolean;
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
  script: string;
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
  selector: string;
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
  selector: string;
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
  selector: string;
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
  selector: string;
  /** 期待されるチェック状態（デフォルト: true） */
  checked?: boolean;
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
