/**
 * CSSセレクタまたは@ref形式、text=形式のプレフィックス
 * これらで始まるセレクタはそのまま使用し、text=を付けない
 */
export const CSS_SELECTOR_PREFIXES = ['@', '#', '.', '[', 'text='];

/**
 * セレクタがCSSセレクタまたは@ref形式かどうかを判定する
 *
 * CSSセレクタの特徴:
 * - #で始まる（ID）
 * - .で始まる（クラス）
 * - [で始まる（属性）
 * - @で始まる（ref形式）
 * - text=で始まる（既にテキストセレクタ形式）
 * - タグ名（英字のみで構成される短い文字列）
 *
 * それ以外はテキストセレクタとして扱う
 */
export const isCssOrRefSelector = (selector: string): boolean => {
  // 既知のプレフィックスで始まるかチェック
  const hasKnownPrefix = CSS_SELECTOR_PREFIXES.some((prefix) => selector.startsWith(prefix));
  if (hasKnownPrefix) return true;
  // タグ名（英字のみで短い文字列）
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector) && selector.length <= 20;
};

/**
 * テキストセレクタを解決する
 *
 * CSSセレクタや@ref形式以外のテキストは、Playwrightのtext=形式に変換する。
 * これにより、静的テキスト要素も検索できるようになる。
 *
 * Playwrightのテキストセレクタ:
 * - text=Hello World → 部分一致（"Hello"を含む要素すべて）
 * - text="Hello World" → 完全一致（exactly "Hello World"）
 *
 * strict mode violationを避けるため、完全一致（ダブルクォート付き）を使用する。
 */
export const resolveTextSelector = (selector: string): string => {
  if (isCssOrRefSelector(selector)) {
    return selector;
  }
  return `text="${selector}"`;
};
