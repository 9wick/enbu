import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    globals: true,
    environment: 'node',
    // E2Eテストは時間がかかるため、タイムアウトを長めに設定
    testTimeout: 60000,
    hookTimeout: 30000,
    // E2Eテストではカバレッジを取得しない（実行時間削減）
    coverage: {
      enabled: false,
    },
  },
});
