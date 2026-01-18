import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const packageDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [resolve(packageDir, 'tsconfig.json')],
    }),
  ],
  test: {
    name: 'vscode-extension',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
    alias: {
      // vscodeモジュールをモックに置き換え
      vscode: resolve(packageDir, 'src/__mocks__/vscode.ts'),
    },
  },
});
