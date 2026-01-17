import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * 統合テスト用のVitest設定
 *
 * tests/integration/ 配下のテストファイルを実行するための設定。
 * エイリアスを設定して、@packages/* のモジュールを解決できるようにします。
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@packages/agent-browser-adapter': resolve(__dirname, 'packages/agent-browser-adapter/src'),
      '@packages/core': resolve(__dirname, 'packages/core/src'),
      '@packages/common': resolve(__dirname, 'packages/common/src'),
    },
  },
});
