# Development Guide

MVP実装のための開発ガイドです。

## 実装フェーズ

```
Phase 1: @packages/agent-browser-adapter（外部との境界）
    ↓
Phase 2: @packages/core - 型定義・パーサー（データ構造）
    ↓
Phase 3: @packages/core - エグゼキュータ（ビジネスロジック）
    ↓
Phase 4: @apps/cli（ユーザーインターフェース）
    ↓
Phase 5: 統合・E2Eテスト
```

## フェーズ詳細

| Phase | 内容 | 詳細 | 依存 |
|-------|------|------|------|
| 1 | agent-browser-adapter | [phase1/](./phase1/) | なし |
| 2 | core - 型・パーサー | [phase2/](./phase2/) | Phase 1 |
| 3 | core - エグゼキュータ | [phase3/](./phase3/) | Phase 2 |
| 4 | CLI | [phase4/](./phase4/) | Phase 3 |
| 5 | 統合・E2E | [phase5/](./phase5/) | Phase 4 |

## フェーズ間のインターフェース

各フェーズは独立して実装可能です。
フェーズ間の連携は、各フェーズの `API.md` で定義された公開APIのみを通じて行います。

```
Phase 1 ─── API.md ───► Phase 2, 3
Phase 2 ─── API.md ───► Phase 3
Phase 3 ─── API.md ───► Phase 4
```

## MVP スコープ

### 含まれる機能

- CLI基本構造（init, run）
- YAMLパース（シンプルなシーケンスのみ）
- 基本コマンド（open, click, type, fill, press, hover, select, scroll, scrollintoview, wait, screenshot, snapshot, eval）
- 基本アサーション（assertVisible, assertEnabled, assertChecked）
- 環境変数サポート
- 自動待機
- 失敗時のトレースログ
- --headedオプション
- --sessionオプション
- agent-browserインストールチェック

### 含まれない機能（将来実装）

- runFlow（サブフロー）
- when（条件分岐）
- repeat（ループ）
- 並列実行
- 複数レポート形式（JUnit XML, TAP）
- コンフィグファイル
- デバイスプリセット
- recordコマンド
- ファイルアップロード
- ダイアログハンドリング

## 実装ルール（CLAUDE.md準拠）

### neverthrow

- `isOk`/`isErr` で分岐せず、`match`/`map`/`andThen` を使用
- `fromThrowable` のスコープは最小限
- フロー要素は小さく単純に

### エラーハンドリング

- throw禁止、Result型で扱う
- Fail Fast: 早期にエラー検出

### 設計

- 純粋関数を基本、副作用は最小限
- classは基本使用禁止
- YAGNI: 必要なものだけ実装
