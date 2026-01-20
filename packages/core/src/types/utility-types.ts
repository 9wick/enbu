/**
 * ユーティリティ型定義
 *
 * 汎用的なシンボルベースの型を定義する。
 * ドメイン固有の型（Command, Error, Flow）とは独立した、
 * プロジェクト全体で使用可能なユーティリティ型。
 */

/**
 * ユーザーが値を指定しなかった場合、デフォルト値を使用することを示すシンボル
 *
 * 用途:
 * - コマンドオプションで明示的な指定がない場合のデフォルト値適用
 * - 例: `full?: boolean` → `full: boolean | UseDefault`
 *
 * @example
 * ```typescript
 * type ScreenshotOptions = {
 *   full: boolean | UseDefault;
 * };
 *
 * // ユーザーが指定しなかった場合
 * const options: ScreenshotOptions = { full: UseDefault };
 * ```
 */
export const UseDefault = Symbol('UseDefault');
export type UseDefault = typeof UseDefault;

/**
 * 情報が取得できなかった/存在しないことを示すシンボル
 *
 * 用途:
 * - パースエラーで行番号やカラム番号が取得できない場合
 * - 例: `line?: number` → `line: number | NoInfo`
 *
 * undefinedとの違い:
 * - undefined: 値が存在しない可能性がある（オプショナル）
 * - NoInfo: 値は必須だが、取得できなかった（明示的な情報不在）
 *
 * @example
 * ```typescript
 * type ParseError = {
 *   message: string;
 *   line: number | NoInfo;
 *   column: number | NoInfo;
 * };
 *
 * // 行番号が取得できなかった場合
 * const error: ParseError = {
 *   message: 'Syntax error',
 *   line: NoInfo,
 *   column: NoInfo,
 * };
 * ```
 */
export const NoInfo = Symbol('NoInfo');
export type NoInfo = typeof NoInfo;
