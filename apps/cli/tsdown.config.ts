import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'tsdown/config';

// package.jsonからバージョン情報を読み込む
// ビルド時にバージョン情報をコードに埋め込むために使用
const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, './package.json'), 'utf-8'));

export default defineConfig({
  entry: ['src/main.ts'],
  tsconfig: './tsconfig.json',
  outDir: 'dist',
  platform: 'node',
  target: 'es2022',
  format: ['es'],
  fixedExtension: true,
  dts: false,
  sourcemap: true,
  // すべての依存関係をバンドルする（node組み込みモジュール以外）
  noExternal: [/.*/],
  clean: true,
  // CLIとして実行可能にするためのshebangをバンドル先頭に追加
  banner: {
    js: '#!/usr/bin/env node',
  },
  // ビルド時にバージョン情報を埋め込む
  // __VERSION__定数がバージョン文字列に置換される
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
