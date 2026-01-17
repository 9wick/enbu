/**
 * ビルド時に埋め込まれるバージョン情報
 *
 * tsdown.config.tsのdefineオプションで埋め込まれる定数。
 * ビルド時にpackage.jsonのバージョン情報で置換される。
 */
declare const __VERSION__: string;
