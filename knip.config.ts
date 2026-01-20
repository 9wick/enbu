import type { KnipConfig } from 'knip';

/**
 * Knip設定ファイル
 * デッドコード検出ツールの設定。誤検出を防ぐための除外設定を含む。
 */
const config: KnipConfig = {
  workspaces: {
    '.': {
      ignoreDependencies: [
        // Nxワークスペース機能で内部的に使用される可能性がある
        '@nx/workspace',
      ],
      ignoreBinaries: [
        // preinstallスクリプトでnpx経由で使用される
        'only-allow',
      ],
    },
    'packages/core': {
      ignore: [
        // バレルファイルはパッケージの公開API
        'src/index.ts',
      ],
    },
  },
};

export default config;
