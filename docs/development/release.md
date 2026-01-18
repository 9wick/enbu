リリース手順

1. リリース実行コマンド

バージョン指定方法

semverキーワードで指定

# パッチバージョン (1.0.0 → 1.0.1)
pnpm exec nx release --version=patch

# マイナーバージョン (1.0.0 → 1.1.0)
pnpm exec nx release --version=minor

# メジャーバージョン (1.0.0 → 2.0.0)
pnpm exec nx release --version=major

プレリリース

# プレリリース (1.0.0 → 1.0.1-0 または 1.0.1-alpha.0)
pnpm exec nx release --version=prerelease

# 特定のプレリリースタグ
pnpm exec nx release --version=prerelease --preid=beta
# 結果: 1.0.0 → 1.0.1-beta.0

明示的なバージョン

pnpm exec nx release --version=2.5.0

自動判定（Conventional Commits）

# コミットメッセージから自動判定
pnpm exec nx release

# ドライラン（実際には何も変更しない、確認用）
pnpm exec nx release --dry-run

# 本番リリース
pnpm exec nx release

2. 設定の詳細 (nx.json:65-91)

| 項目               | 設定値                           |
  |--------------------|----------------------------------|
| 対象プロジェクト   | cli のみ                         |
| バージョニング     | Conventional Commits ベース      |
| タグパターン       | v{version} (例: v1.2.3)          |
| コミットメッセージ | chore(release): {version}        |
| CHANGELOG          | apps/cli/CHANGELOG.md に自動生成 |

3. リリースフロー

1. pnpm nx run-many -t build -p cli が自動実行（preVersionCommand）
2. Conventional Commitsから次バージョンを決定
3. CHANGELOG.md を更新
4. Gitコミット＆タグ作成

4. オプション

# 特定バージョンを指定
pnpm exec nx release --version=1.0.0

# 最初のリリース時
pnpm exec nx release --first-release

# リリース後にpublishまで行う場合
pnpm exec nx release publish