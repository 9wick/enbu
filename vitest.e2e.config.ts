import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/utils/custom-matchers.ts'],
    // E2Eテストは時間がかかるため、タイムアウトを長めに設定
    testTimeout: 60000,
    hookTimeout: 30000,
    // agent-browserの競合を避けるためシーケンシャル実行
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // E2Eテストではカバレッジを取得しない（実行時間削減）
    coverage: {
      enabled: false,
    },
  },
});
