/**
 * CSSセレクタまたは@ref形式、text=形式のプレフィックス
 * これらで始まるセレクタはそのまま使用し、text=を付けない
 */
export const CSS_SELECTOR_PREFIXES = ['@', '#', '.', '[', 'text='];

/**
 * セレクタがCSSセレクタまたは@ref形式かどうかを判定する
 *
 * 以下の形式のみCSSセレクタ/@ref形式として扱う:
 * - #で始まる（ID）
 * - .で始まる（クラス）
 * - [で始まる（属性）
 * - @で始まる（ref形式）
 * - text=で始まる（既にテキストセレクタ形式）
 *
 * 注意: HTMLタグ名（div, span等）はテキストセレクタとして扱う。
 * これは意図的な設計で、純粋なテキスト（例: "Welcome"）が
 * タグ名と誤認識されることを防ぐため。
 * タグ名でセレクトしたい場合は、ユーザーが明示的にCSSセレクタ形式を使用する必要がある。
 */
export const isCssOrRefSelector = (selector: string): boolean => {
  return CSS_SELECTOR_PREFIXES.some((prefix) => selector.startsWith(prefix));
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
