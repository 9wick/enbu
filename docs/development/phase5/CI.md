# Phase 5: CI/CD設定

このドキュメントはGitHub Actionsを使用したCI/CD設定の詳細を定義します。

---

## CI/CDの目的

1. **品質保証**: 全てのpush/PRで自動テストを実行
2. **早期検出**: 問題を早期に発見し、修正コストを削減
3. **ドキュメント**: CIログが実行可能なドキュメントとして機能
4. **信頼性**: プロダクション環境での動作を保証

---

## GitHub Actions ワークフロー

### ワークフロー一覧

| ワークフロー名 | トリガー | 実行内容 | 実行時間目標 |
|--------------|---------|---------|-------------|
| Test | push, pull_request | 品質チェック + テスト | 10分以内 |
| Release | tag push (v*.*.*) | リリースビルド + パッケージ公開 | 15分以内 |

---

## Test ワークフロー

### ファイル配置

`.github/workflows/test.yml`

### ワークフロー仕様

```yaml
name: Test

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
      - develop

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x]

    steps:
      # 1. リポジトリのチェックアウト
      - name: Checkout repository
        uses: actions/checkout@v4

      # 2. Node.jsのセットアップ
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      # 3. pnpmのインストール
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8

      # 4. 依存関係のキャッシュ
      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      # 5. 依存関係のインストール
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # 6. agent-browserのインストール
      - name: Install Rust toolchain
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: stable

      - name: Install agent-browser
        run: cargo install agent-browser
        env:
          CARGO_NET_RETRY: 10

      - name: Verify agent-browser installation
        run: npx agent-browser --help

      # 7. 型チェック
      - name: Type check
        run: pnpm run typecheck

      # 8. Lint
      - name: Lint
        run: pnpm run lint:check

      # 9. Format check
      - name: Format check
        run: pnpm run format:check

      # 10. ビルド
      - name: Build
        run: pnpm run build

      # 11. 統合テスト
      - name: Run integration tests
        run: pnpm run test:integration

      # 12. E2Eテスト
      - name: Run E2E tests
        run: pnpm run test:e2e
        env:
          # E2Eテストはヘッドレスモードで実行
          HEADED: false
          # タイムアウトを延長（CI環境は遅い）
          TEST_TIMEOUT: 60000

      # 13. テスト結果のアップロード
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
            test-results/
          retention-days: 30

      # 14. スクリーンショットのアップロード（失敗時のみ）
      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots-failure
          path: screenshots/
          retention-days: 7
```

### ステップ詳細

#### 1. リポジトリのチェックアウト

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```

**目的**: GitHubリポジトリのコードをCI環境にダウンロード

**オプション**:
- `fetch-depth: 0` - 全履歴を取得（リリース時に必要）

---

#### 2. Node.jsのセットアップ

```yaml
- name: Setup Node.js ${{ matrix.node-version }}
  uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
```

**目的**: 指定バージョンのNode.jsをインストール

**マトリクス戦略**:
- 現在: Node.js 20.x のみ
- 将来: 複数バージョンでのテストも可能

---

#### 3. pnpmのインストール

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 8
```

**目的**: pnpmパッケージマネージャーをインストール

**バージョン**: プロジェクトの `package.json` の `packageManager` フィールドと一致させる

---

#### 4-5. 依存関係のキャッシュとインストール

```yaml
- name: Get pnpm store directory
  id: pnpm-cache
  shell: bash
  run: |
    echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**目的**: 依存関係のインストール時間を短縮

**キャッシュキー**: `pnpm-lock.yaml` のハッシュ値を使用

**`--frozen-lockfile`**: ロックファイルを変更せず、厳密に再現

---

#### 6. agent-browserのインストール

```yaml
- name: Install Rust toolchain
  uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: stable

- name: Install agent-browser
  run: cargo install agent-browser
  env:
    CARGO_NET_RETRY: 10

- name: Verify agent-browser installation
  run: npx agent-browser --help
```

**目的**: E2Eテストに必要な agent-browser CLI をインストール

**注意点**:
- Rustコンパイラが必要
- インストールに3-5分かかる可能性
- `CARGO_NET_RETRY: 10` でネットワークエラーを回避

**キャッシュの検討**:
```yaml
# 将来的にagent-browserのキャッシュを追加可能
- name: Cache agent-browser
  uses: actions/cache@v4
  with:
    path: ~/.cargo/bin/agent-browser
    key: ${{ runner.os }}-agent-browser-${{ hashFiles('**/Cargo.lock') }}
```

---

#### 7-9. 品質チェック

```yaml
- name: Type check
  run: pnpm run typecheck

- name: Lint
  run: pnpm run lint:check

- name: Format check
  run: pnpm run format:check
```

**目的**: コード品質を保証

**失敗条件**:
- 型エラーが存在
- ESLintルール違反
- フォーマット違反

---

#### 10. ビルド

```yaml
- name: Build
  run: pnpm run build
```

**目的**: プロダクションビルドが成功することを確認

**Nxの動作**:
- `nx affected --target=build` が実行される
- 変更されたプロジェクトのみビルド

---

#### 11-12. テスト実行

```yaml
- name: Run integration tests
  run: pnpm run test:integration

- name: Run E2E tests
  run: pnpm run test:e2e
  env:
    HEADED: false
    TEST_TIMEOUT: 60000
```

**統合テスト**:
- agent-browserをモック化
- 高速実行（30秒以内）

**E2Eテスト**:
- 実際のagent-browserを使用
- ヘッドレスモード
- タイムアウトを60秒に延長（CI環境は遅い）

---

#### 13-14. 成果物のアップロード

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: |
      coverage/
      test-results/
    retention-days: 30

- name: Upload screenshots on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: screenshots-failure
    path: screenshots/
    retention-days: 7
```

**テスト結果**:
- 常にアップロード（`if: always()`）
- カバレッジレポート
- Vitestのテストレポート
- 30日間保持

**スクリーンショット**:
- 失敗時のみアップロード（`if: failure()`）
- デバッグ用
- 7日間保持

---

## Release ワークフロー

### ファイル配置

`.github/workflows/release.yml`

### ワークフロー仕様

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest

    permissions:
      contents: write
      packages: write

    steps:
      # 1-5. Test ワークフローと同じ（チェックアウト～依存関係）
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # 6. バージョン検証
      - name: Verify version
        run: |
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          PACKAGE_VERSION=$(node -p "require('./package.json').version")
          if [ "$TAG_VERSION" != "$PACKAGE_VERSION" ]; then
            echo "Tag version ($TAG_VERSION) does not match package.json version ($PACKAGE_VERSION)"
            exit 1
          fi

      # 7. ビルド
      - name: Build
        run: pnpm run build

      # 8. テスト（統合テストのみ、E2Eはスキップして高速化）
      - name: Run tests
        run: pnpm run test:integration

      # 9. npm公開
      - name: Publish to npm
        run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # 10. GitHub Releaseの作成
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Release ${{ github.ref }}

            ## Installation
            ```bash
            npm install agent-browser-flow
            ```

            ## Changes
            See [CHANGELOG.md](CHANGELOG.md) for details.
          draft: false
          prerelease: false
```

### リリース手順

1. **バージョン更新**:
   ```bash
   pnpm version patch  # または minor, major
   ```

2. **変更をコミット**:
   ```bash
   git add .
   git commit -m "chore: bump version to X.Y.Z"
   ```

3. **タグをプッシュ**:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```

4. **GitHub Actionsが自動実行**:
   - テスト実行
   - npmパッケージ公開
   - GitHub Release作成

---

## package.json スクリプト

CI/CDで使用するスクリプトを定義します。

```json
{
  "scripts": {
    "test": "nx affected --target=test",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "test:coverage": "vitest run --coverage",
    "typecheck": "nx affected --target=typecheck",
    "lint": "nx affected --target=lint --fix",
    "lint:check": "nx affected --target=lint",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "build": "nx affected --target=build",
    "prepush": "pnpm run format && pnpm run typecheck && pnpm run lint:check && pnpm run build && pnpm run test"
  }
}
```

---

## Vitest設定

### 統合テスト用設定

**ファイル**: `vitest.integration.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
    },
  },
});
```

### E2Eテスト用設定

**ファイル**: `vitest.e2e.config.ts`

```typescript
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
```

---

## 環境変数

CI/CD環境で使用する環境変数です。

### GitHub Secrets

以下のSecretsをGitHubリポジトリに設定します:

| Secret名 | 用途 | 取得方法 |
|---------|------|---------|
| `NPM_TOKEN` | npmパッケージ公開 | https://www.npmjs.com/settings/{username}/tokens |

**設定方法**:
1. GitHubリポジトリの Settings → Secrets and variables → Actions
2. "New repository secret" をクリック
3. Name: `NPM_TOKEN`, Secret: （npmトークン）を入力

### 環境変数一覧

| 変数名 | デフォルト値 | 用途 |
|-------|------------|------|
| `HEADED` | `false` | ヘッドレスモードの制御 |
| `TEST_TIMEOUT` | `30000` | テストタイムアウト（ミリ秒） |
| `CARGO_NET_RETRY` | `10` | Cargoのネットワークリトライ回数 |

---

## CI最適化

### キャッシュ戦略

1. **pnpmストアのキャッシュ**:
   - キー: `pnpm-lock.yaml` のハッシュ値
   - 効果: 依存関係インストール時間を 3分 → 30秒 に短縮

2. **agent-browserのキャッシュ（検討中）**:
   - キー: agent-browserのバージョン
   - 効果: インストール時間を 5分 → 10秒 に短縮

3. **Nxキャッシュ**:
   - Nxのビルドキャッシュを使用
   - 変更されたプロジェクトのみビルド

### 並列実行

現在は単一ジョブで実行していますが、将来的には並列化を検討:

```yaml
jobs:
  quality:
    # 品質チェックのみ（高速）
    steps:
      - typecheck
      - lint
      - format

  integration:
    # 統合テスト
    needs: quality
    steps:
      - test:integration

  e2e:
    # E2Eテスト
    needs: quality
    steps:
      - install agent-browser
      - test:e2e
```

---

## トラブルシューティング

### agent-browserのインストールに失敗

**症状**: `cargo install agent-browser` がタイムアウトまたはエラー

**対策**:
1. `CARGO_NET_RETRY` を増やす
2. Rustツールチェインのバージョンを固定
3. agent-browserのバイナリをキャッシュ

### E2Eテストがタイムアウト

**症状**: E2Eテストが `TEST_TIMEOUT` を超過

**対策**:
1. `TEST_TIMEOUT` を延長（60秒 → 120秒）
2. ヘッドレスモードを確認（`HEADED=false`）
3. CI環境でのagent-browserのパフォーマンスを調査

### テスト結果が不安定（Flaky Tests）

**症状**: 同じテストが成功したり失敗したりする

**対策**:
1. `wait` や `assertVisible` でページロードを待機
2. タイムアウトを適切に設定
3. テストの独立性を確保（各テストで異なるセッション名を使用）

---

## ローカルでのCIテスト

GitHub Actionsをローカルで実行して、CI環境を再現できます。

### actのインストール

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### ワークフローの実行

```bash
# Test ワークフローを実行
act -j test

# 特定のステップのみ実行
act -j test -s "Run E2E tests"

# 環境変数を指定
act -j test --env HEADED=true
```

### 注意点

- Dockerが必要
- 初回実行時は時間がかかる
- GitHub Secretsはローカルファイル（`.secrets`）から読み込み

---

## 受け入れ基準チェックリスト

Phase 5 のCI/CD設定完了時に以下を全て満たすこと:

### ワークフロー設定

- [ ] `.github/workflows/test.yml` が実装されている
- [ ] `.github/workflows/release.yml` が実装されている
- [ ] 全てのステップが適切に定義されている
- [ ] 環境変数が正しく設定されている

### テスト実行

- [ ] 統合テストがCI環境で成功
- [ ] E2EテストがCI環境で成功
- [ ] テスト結果がアーティファクトとしてアップロードされる
- [ ] 失敗時にスクリーンショットがアップロードされる

### パフォーマンス

- [ ] CI全体が10分以内に完了
- [ ] 依存関係のキャッシュが機能
- [ ] agent-browserのインストールが成功

### リリース

- [ ] タグpush時にReleaseワークフローが起動
- [ ] npmパッケージが正しく公開される
- [ ] GitHub Releaseが作成される

### ドキュメント

- [ ] CI.mdに全ての設定が記載されている
- [ ] トラブルシューティングガイドが記載されている
- [ ] ローカルでのテスト方法が記載されている
