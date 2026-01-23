import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@packages/agent-browser-adapter': resolve(__dirname, 'packages/agent-browser-adapter/src'),
      '@packages/core': resolve(__dirname, 'packages/core/src'),
      '@packages/common': resolve(__dirname, 'packages/common/src'),
    },
  },
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/utils/custom-matchers.ts'],
    // グローバルセットアップ: 共有HTTPサーバー起動 + セッションクリーンアップ
    globalSetup: ['./tests/utils/e2e-global-setup.ts'],
    // E2Eテストは時間がかかるため、タイムアウトを長めに設定
    testTimeout: 90000,
    hookTimeout: 60000,
    // ファイル内テストの並列実行を有効化
    // 各テストが一意なセッション名を使用するため、並列実行が可能
    // test-helpers.tsのrunCliが自動的に--sessionオプションを付与する
    // agent-browserの同時起動数を制限するため、並列度を2に制限
    // 各テストがブラウザセッションを使用するため、過度な並列化はタイムアウトの原因になる
    fileParallelism: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },
    // E2Eテストではカバレッジを取得しない（実行時間削減）
    coverage: {
      enabled: false,
    },
  },
});
