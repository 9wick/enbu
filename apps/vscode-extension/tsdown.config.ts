import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'tsdown/config';

// package.jsonからバージョン情報を読み込む
const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, './package.json'), 'utf-8'));

export default defineConfig({
  entry: ['src/extension.ts'],
  tsconfig: './tsconfig.json',
  outDir: 'dist',
  platform: 'node',
  target: 'es2022',
  format: ['es'],
  fixedExtension: true,
  dts: false,
  sourcemap: true,
  // VS Code拡張機能では、vscodeモジュールは外部として扱う
  external: ['vscode'],
  clean: true,
  // ビルド時にバージョン情報を埋め込む
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
