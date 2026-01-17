import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const packageDir = dirname(fileURLToPath(import.meta.url));

// package.jsonからバージョン情報を読み込む
// テスト実行時にバージョン情報をコードに埋め込むために使用
const pkg = JSON.parse(readFileSync(resolve(packageDir, './package.json'), 'utf-8'));

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [resolve(packageDir, 'tsconfig.json')],
    }),
  ],
  // テスト実行時にバージョン情報を埋め込む
  // __VERSION__定数がバージョン文字列に置換される
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    name: 'cli',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
});
