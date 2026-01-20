import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/utils/custom-matchers.ts'],
    // テスト終了後にenbu-e2e-*セッションをクリーンアップ
    globalSetup: ['./tests/utils/e2e-teardown.ts'],
    // E2Eテストは時間がかかるため、タイムアウトを長めに設定
    testTimeout: 60000,
    hookTimeout: 30000,
    // 各テストが一意なセッション名を使用するため、並列実行が可能
    // test-helpers.tsのrunCliが自動的に--sessionオプションを付与する
    pool: 'forks',
    poolOptions: {
      forks: {
        // 4並列で実行（CPU/メモリに余裕があれば増やせる）
        maxForks: 4,
        minForks: 1,
      },
    },
    // E2Eテストではカバレッジを取得しない（実行時間削減）
    coverage: {
      enabled: false,
    },
  },
});
