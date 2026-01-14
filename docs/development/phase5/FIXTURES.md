# Phase 5: テストフィクスチャ仕様

このドキュメントは統合・E2Eテストで使用するフィクスチャファイルの詳細仕様を定義します。

---

## フィクスチャの配置

```
tests/fixtures/
├── html/                         # HTMLテストページ
│   ├── login-form.html           # ログインフォーム
│   ├── buttons.html              # ボタン操作用
│   ├── form-elements.html        # フォーム要素用
│   └── assertions.html           # アサーション用
└── flows/                        # YAMLフローファイル
    ├── simple.flow.yaml          # 基本的なフロー
    ├── login.flow.yaml           # ログインフロー
    ├── assertions.flow.yaml      # アサーションテスト用
    ├── interactions.flow.yaml    # 操作テスト用
    ├── error-case.flow.yaml      # エラーケース用
    ├── invalid.flow.yaml         # YAML構文エラー用
    └── unknown-action.flow.yaml  # 不明なアクション用
```

---

## HTMLフィクスチャ

### tests/fixtures/html/login-form.html

ログインフォームのテストページ。

**用途**:
- 基本的なナビゲーションテスト
- フォーム入力テスト
- ボタンクリックテスト

**仕様**:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ログインページ</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 400px;
      margin: 50px auto;
      padding: 20px;
    }
    h1 {
      color: #333;
    }
    label {
      display: block;
      margin-top: 10px;
      font-weight: bold;
    }
    input {
      width: 100%;
      padding: 8px;
      margin-top: 5px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
    .message {
      margin-top: 20px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
      display: none;
    }
  </style>
</head>
<body>
  <h1>ログイン</h1>
  <form id="loginForm">
    <label for="email">
      メールアドレス
      <input type="email" id="email" name="email" required>
    </label>

    <label for="password">
      パスワード
      <input type="password" id="password" name="password" required>
    </label>

    <button type="submit">ログイン</button>
  </form>

  <div class="message" id="message"></div>

  <script>
    // フォーム送信時の動作
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const messageDiv = document.getElementById('message');
      messageDiv.style.display = 'block';
      messageDiv.textContent = `ログイン試行: ${email}`;
    });
  </script>
</body>
</html>
```

**テスト可能な要素**:

| セレクタ | role | 用途 |
|---------|------|------|
| ログイン | heading | ページタイトルの確認 |
| メールアドレス | textbox | テキスト入力 |
| パスワード | textbox | パスワード入力 |
| ログイン | button | ボタンクリック |

---

### tests/fixtures/html/buttons.html

各種ボタン状態のテストページ。

**用途**:
- assertEnabled / assertDisabled テスト
- ボタンクリックテスト

**仕様**:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ボタンテスト</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    button {
      margin: 10px;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .result {
      margin-top: 20px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>ボタンテスト</h1>

  <section>
    <h2>基本ボタン</h2>
    <button id="enabledBtn">有効なボタン</button>
    <button id="disabledBtn" disabled>無効なボタン</button>
  </section>

  <section>
    <h2>カウンターボタン</h2>
    <button id="counterBtn">クリック回数: 0</button>
  </section>

  <section>
    <h2>状態変更ボタン</h2>
    <button id="toggleBtn">クリックして無効化</button>
  </section>

  <div class="result" id="result"></div>

  <script>
    // カウンターボタン
    let count = 0;
    document.getElementById('counterBtn').addEventListener('click', function() {
      count++;
      this.textContent = `クリック回数: ${count}`;
      document.getElementById('result').textContent = `カウント: ${count}`;
    });

    // トグルボタン
    document.getElementById('toggleBtn').addEventListener('click', function() {
      this.disabled = true;
      this.textContent = '無効化されました';
    });
  </script>
</body>
</html>
```

**テスト可能な要素**:

| セレクタ | role | 状態 | 用途 |
|---------|------|------|------|
| 有効なボタン | button | enabled | assertEnabled テスト |
| 無効なボタン | button | disabled | assertDisabled テスト |
| クリック回数: 0 | button | enabled | クリックアクションテスト |
| クリックして無効化 | button | enabled → disabled | 状態変更テスト |

---

### tests/fixtures/html/form-elements.html

各種フォーム要素のテストページ。

**用途**:
- type / fill アクションテスト
- assertChecked / assertUnchecked テスト
- 複雑なフォーム操作テスト

**仕様**:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>フォーム要素テスト</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    label {
      display: block;
      margin-top: 15px;
      font-weight: bold;
    }
    input[type="text"],
    input[type="email"],
    input[type="number"],
    textarea,
    select {
      width: 100%;
      padding: 8px;
      margin-top: 5px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .checkbox-group,
    .radio-group {
      margin-top: 5px;
    }
    .checkbox-group label,
    .radio-group label {
      display: inline-block;
      margin-right: 15px;
      font-weight: normal;
    }
    button {
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>フォーム要素テスト</h1>

  <form id="testForm">
    <!-- テキスト入力 -->
    <label for="username">
      ユーザー名
      <input type="text" id="username" name="username">
    </label>

    <!-- メールアドレス -->
    <label for="email">
      メールアドレス
      <input type="email" id="email" name="email">
    </label>

    <!-- 数値入力 -->
    <label for="age">
      年齢
      <input type="number" id="age" name="age" min="0" max="150">
    </label>

    <!-- チェックボックス -->
    <label>趣味（複数選択可）</label>
    <div class="checkbox-group">
      <label>
        <input type="checkbox" name="hobby" value="reading" id="hobbyReading">
        読書
      </label>
      <label>
        <input type="checkbox" name="hobby" value="sports" id="hobbySports">
        スポーツ
      </label>
      <label>
        <input type="checkbox" name="hobby" value="music" id="hobbyMusic" checked>
        音楽
      </label>
    </div>

    <!-- ラジオボタン -->
    <label>性別</label>
    <div class="radio-group">
      <label>
        <input type="radio" name="gender" value="male" id="genderMale">
        男性
      </label>
      <label>
        <input type="radio" name="gender" value="female" id="genderFemale">
        女性
      </label>
      <label>
        <input type="radio" name="gender" value="other" id="genderOther" checked>
        その他
      </label>
    </div>

    <!-- セレクトボックス -->
    <label for="country">
      国
      <select id="country" name="country">
        <option value="">選択してください</option>
        <option value="jp">日本</option>
        <option value="us">アメリカ</option>
        <option value="uk">イギリス</option>
      </select>
    </label>

    <!-- テキストエリア -->
    <label for="bio">
      自己紹介
      <textarea id="bio" name="bio" rows="4"></textarea>
    </label>

    <button type="submit">送信</button>
  </form>

  <script>
    document.getElementById('testForm').addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('フォーム送信');
    });
  </script>
</body>
</html>
```

**テスト可能な要素**:

| セレクタ | role | 状態 | 用途 |
|---------|------|------|------|
| ユーザー名 | textbox | - | type / fill テスト |
| メールアドレス | textbox | - | type / fill テスト |
| 年齢 | spinbutton | - | 数値入力テスト |
| 読書 | checkbox | unchecked | assertUnchecked テスト |
| スポーツ | checkbox | unchecked | assertUnchecked テスト |
| 音楽 | checkbox | checked | assertChecked テスト |
| 男性 | radio | unchecked | ラジオボタンテスト |
| 女性 | radio | unchecked | ラジオボタンテスト |
| その他 | radio | checked | ラジオボタンテスト |
| 国 | combobox | - | セレクトボックステスト |
| 自己紹介 | textbox | - | テキストエリアテスト |
| 送信 | button | enabled | 送信テスト |

---

### tests/fixtures/html/assertions.html

アサーションテスト用のページ。

**用途**:
- assertVisible テスト
- 複数要素の状態確認テスト

**仕様**:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>アサーションテスト</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    .hidden {
      display: none;
    }
    section {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>アサーションテスト</h1>

  <section>
    <h2>可視性テスト</h2>
    <p id="visibleText">これは表示されています</p>
    <p id="hiddenText" class="hidden">これは非表示です</p>
  </section>

  <section>
    <h2>ボタン状態テスト</h2>
    <button id="enabledButton">有効</button>
    <button id="disabledButton" disabled>無効</button>
  </section>

  <section>
    <h2>チェックボックステスト</h2>
    <label>
      <input type="checkbox" id="checkedBox" checked>
      チェック済み
    </label>
    <label>
      <input type="checkbox" id="uncheckedBox">
      未チェック
    </label>
  </section>
</body>
</html>
```

**テスト可能な要素**:

| セレクタ | role | 状態 | 用途 |
|---------|------|------|------|
| これは表示されています | - | visible | assertVisible テスト |
| これは非表示です | - | hidden | 非表示要素テスト |
| 有効 | button | enabled | assertEnabled テスト |
| 無効 | button | disabled | assertDisabled テスト |
| チェック済み | checkbox | checked | assertChecked テスト |
| 未チェック | checkbox | unchecked | assertUnchecked テスト |

---

## YAMLフローフィクスチャ

### tests/fixtures/flows/simple.flow.yaml

基本的なフロー。E2Eテストの基盤として使用。

**用途**:
- 基本的なナビゲーションテスト
- 複数ステップの実行テスト

**仕様**:

```yaml
# シンプルなフローファイル
# テスト用HTTPサーバー（localhost:8080）が起動していることを前提とする

# ステップ1: ページを開く
- open: http://localhost:8080/login-form.html

# ステップ2: タイトルの存在を確認
- assertVisible: ログイン

# ステップ3: メールアドレス入力フィールドの存在を確認
- assertVisible: メールアドレス

# ステップ4: スクリーンショットを撮影（オプション指定時のみ）
- screenshot: login-page
```

**期待される結果**:
- 全ステップが成功
- `--screenshot-dir` 指定時は `login-page.png` が生成される

---

### tests/fixtures/flows/login.flow.yaml

ログインフォームの操作フロー。

**用途**:
- フォーム入力テスト
- ボタンクリックテスト

**仕様**:

```yaml
# ログインフローのテスト

# ページを開く
- open: http://localhost:8080/login-form.html

# フォームが表示されていることを確認
- assertVisible: ログイン

# メールアドレスを入力
- type:
    selector: メールアドレス
    text: test@example.com

# パスワードを入力
- type:
    selector: パスワード
    text: password123

# ログインボタンをクリック
- click: ログイン

# 送信後のメッセージが表示されることを確認
- assertVisible: ログイン試行
```

**期待される結果**:
- 全ステップが成功
- フォーム送信後のメッセージが表示される

---

### tests/fixtures/flows/assertions.flow.yaml

各種アサーションのテストフロー。

**用途**:
- assertVisible テスト
- assertEnabled / assertDisabled テスト
- assertChecked / assertUnchecked テスト

**仕様**:

```yaml
# アサーションテストフロー

# ページを開く
- open: http://localhost:8080/assertions.html

# 可視性のテスト
- assertVisible: これは表示されています

# ボタン状態のテスト
- assertEnabled: 有効
- assertDisabled: 無効

# チェックボックス状態のテスト
- assertChecked: チェック済み
- assertUnchecked: 未チェック
```

**期待される結果**:
- 全てのアサーションが成功

---

### tests/fixtures/flows/interactions.flow.yaml

各種操作のテストフロー。

**用途**:
- type / fill アクションテスト
- click アクションテスト
- press アクションテスト

**仕様**:

```yaml
# 操作テストフロー

# ページを開く
- open: http://localhost:8080/form-elements.html

# テキスト入力
- type:
    selector: ユーザー名
    text: テストユーザー

# メールアドレス入力
- type:
    selector: メールアドレス
    text: test@example.com

# 年齢入力
- fill:
    selector: 年齢
    value: 25

# チェックボックスをクリック
- click: 読書

# チェックされたことを確認
- assertChecked: 読書

# ボタンをクリック
- click: 送信
```

**期待される結果**:
- 全ての入力・操作が成功
- フォームが送信される

---

### tests/fixtures/flows/error-case.flow.yaml

エラーケースのテストフロー。

**用途**:
- 存在しない要素のエラーテスト
- アサーション失敗のテスト

**仕様**:

```yaml
# エラーケーステストフロー

# ページを開く
- open: http://localhost:8080/assertions.html

# 存在しない要素を検索（失敗すべき）
- assertVisible: 存在しない要素
```

**期待される結果**:
- 2番目のステップでエラー
- 「Element not found」エラーメッセージが表示される

---

### tests/fixtures/flows/invalid.flow.yaml

YAML構文エラーのテストフロー。

**用途**:
- YAMLパースエラーのテスト
- エラーメッセージの検証

**仕様**:

```yaml
# 意図的に不正なYAML構文を含むファイル

- open: http://localhost:8080/login-form.html
- assertVisible: ログイン
  - invalid: syntax error here  # インデントエラー
```

**期待される結果**:
- YAMLパースエラー
- 行番号が表示される

---

### tests/fixtures/flows/unknown-action.flow.yaml

不明なアクションのテストフロー。

**用途**:
- サポートされていないアクションのエラーテスト

**仕様**:

```yaml
# 不明なアクションを含むフロー

# 正常なステップ
- open: http://localhost:8080/login-form.html

# サポートされていないアクション
- unknownAction:
    param: value
```

**期待される結果**:
- 2番目のステップでエラー
- 「Unknown action」エラーメッセージが表示される
- サポートされているアクション一覧が表示される

---

## フィクスチャの保守ガイドライン

### 命名規則

- **HTMLファイル**: 小文字、ハイフン区切り、`.html` 拡張子
  - 例: `login-form.html`, `form-elements.html`
- **フローファイル**: 小文字、ハイフン区切り、`.flow.yaml` 拡張子
  - 例: `simple.flow.yaml`, `error-case.flow.yaml`

### 追加時の手順

1. **HTMLファイルを追加する場合**:
   - `tests/fixtures/html/` に配置
   - テスト可能な要素に適切な `id` と `name` を付与
   - アクセシビリティを考慮（role属性など）
   - このドキュメントに仕様を追記

2. **フローファイルを追加する場合**:
   - `tests/fixtures/flows/` に配置
   - コメントで各ステップの目的を記載
   - 期待される結果を明記
   - このドキュメントに仕様を追記

### 更新時の注意点

- 既存のテストケースへの影響を確認
- 変更後は必ず関連テストを実行
- 破壊的変更の場合は、依存するテストコードも更新

### 削除時の注意点

- 使用しているテストケースがないか確認
- 削除前に `git grep` で参照箇所を検索
- 削除後はこのドキュメントからも仕様を削除

---

## テストサーバーの仕様

HTMLフィクスチャを配信するテストサーバーは以下の仕様で実装します。

### 実装場所
`tests/utils/file-server.ts`

### 基本仕様
- ポート: 8080（デフォルト）
- ルートディレクトリ: `tests/fixtures/html/`
- Content-Type: `text/html; charset=utf-8`
- 404エラー時: "Not Found" を返す

### 使用方法

```typescript
import { startTestServer } from '../utils/file-server';

// テスト前にサーバーを起動
let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  server = await startTestServer(8080);
});

// テスト後にサーバーを停止
afterAll(async () => {
  await server.close();
});

// テスト内でURLを使用
it('should load HTML fixture', async () => {
  const url = `${server.url}/login-form.html`;
  // テストロジック...
});
```

---

## 受け入れ基準チェックリスト

Phase 5 のフィクスチャ完了時に以下を全て満たすこと:

### HTMLフィクスチャ

- [ ] `login-form.html` が仕様通りに実装されている
- [ ] `buttons.html` が仕様通りに実装されている
- [ ] `form-elements.html` が仕様通りに実装されている
- [ ] `assertions.html` が仕様通りに実装されている
- [ ] 全てのHTMLファイルがW3C準拠
- [ ] 全てのHTMLファイルにアクセシビリティ属性が設定されている

### YAMLフローフィクスチャ

- [ ] `simple.flow.yaml` が仕様通りに実装されている
- [ ] `login.flow.yaml` が仕様通りに実装されている
- [ ] `assertions.flow.yaml` が仕様通りに実装されている
- [ ] `interactions.flow.yaml` が仕様通りに実装されている
- [ ] `error-case.flow.yaml` が仕様通りに実装されている
- [ ] `invalid.flow.yaml` が仕様通りに実装されている
- [ ] `unknown-action.flow.yaml` が仕様通りに実装されている
- [ ] 全てのフローファイルがYAML構文として有効（`invalid.flow.yaml`を除く）

### テストサーバー

- [ ] `tests/utils/file-server.ts` が実装されている
- [ ] 全てのHTMLフィクスチャが正しく配信される
- [ ] 404エラーが適切に処理される
- [ ] サーバーが正常に起動・停止できる

### ドキュメント

- [ ] 全てのフィクスチャがこのドキュメントに記載されている
- [ ] 各フィクスチャの用途が明記されている
- [ ] テスト可能な要素一覧が記載されている
- [ ] 期待される結果が明記されている
