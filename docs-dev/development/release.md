# リリース手順

## 前提条件

- npmにログインしておく（2FAが有効な場合は認証アプリを用意）

```bash
npm login
```

## リリースコマンド

### 1. バージョンアップとタグ作成

```bash
# Conventional Commitsから自動判定してリリース（推奨）
pnpm exec nx release

# 事前確認（dry-run）
pnpm exec nx release --dry-run
```

**重要：** `conventionalCommits: true` のため、コミット履歴から自動判定されます
- `feat:` → minor バージョンアップ（例: 0.3.0 → 0.4.0）
- `fix:` → patch バージョンアップ（例: 0.3.0 → 0.3.1）
- 明示的にバージョンを指定しても、Conventional Commitsの判定が優先される場合があります

### 2. npm公開

```bash
# 2FAが必要な場合（認証アプリから6桁のコードを取得）
pnpm exec nx release publish --otp=123456
```

**注意：** OTPコードは30秒で期限切れになるため、取得後すぐに実行してください

### 3. Gitプッシュ

```bash
# コミットとタグの両方をプッシュ
git push && git push --tags
```

## 実行内容

`pnpm exec nx release` は以下を自動実行します：

1. ビルド実行（`pnpm nx run-many -t build -p cli`）
2. Conventional Commitsから次バージョンを決定
3. `apps/cli/package.json` のバージョン更新
4. `apps/cli/CHANGELOG.md` の更新
5. Gitコミット（`chore(release): {version}`）
6. Gitタグ作成（`v{version}`）

## トラブルシューティング

### 認証エラー

```bash
npm login
```

### 2FA（OTP）エラー

認証アプリから6桁のコードを取得して `--otp` オプションで指定：

```bash
pnpm exec nx release publish --otp=123456
```