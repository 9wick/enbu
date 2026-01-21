# YAML フローリファレンス

このドキュメントはvalibotスキーマから自動生成されています。

## open

**カテゴリ**: ナビゲーション



### 使用例

```yaml
- open: https://example.com
```

---

## scroll

**カテゴリ**: ナビゲーション



### 使用例

```yaml
- scroll:
    direction: <unknown>
    amount: <number>
```

---

## scrollIntoView

**カテゴリ**: ナビゲーション



### 使用例

```yaml
- scrollIntoView: 送信ボタン

- scrollIntoView:
    css: "#login-button"

- scrollIntoView:
    anyText: Welcome

- scrollIntoView:
    xpath: //button[@type='submit']
```

---

## click

**カテゴリ**: インタラクション



### 使用例

```yaml
- click: ログイン

- click:
    css: "#login-button"

- click:
    interactableText: ログイン

- click:
    xpath: //button[@type='submit']
```

---

## hover

**カテゴリ**: インタラクション



### 使用例

```yaml
- hover: ログイン

- hover:
    css: "#login-button"

- hover:
    interactableText: ログイン

- hover:
    xpath: //button[@type='submit']
```

---

## type

**カテゴリ**: 入力



### 使用例

```yaml
- type:
    css: "#username"
    value: ユーザー名

- type:
    interactableText: メールアドレス
    value: ユーザー名

- type:
    xpath: //input[@name='email']
    value: ユーザー名
```

---

## fill

**カテゴリ**: 入力



### 使用例

```yaml
- fill:
    css: "#email"
    value: 新しいユーザー名

- fill:
    interactableText: メールアドレス
    value: 新しいユーザー名

- fill:
    xpath: //input[@type='password']
    value: 新しいユーザー名
```

---

## select

**カテゴリ**: 入力



### 使用例

```yaml
- select:
    css: "#country"
    value: japan

- select:
    interactableText: 国を選択
    value: japan

- select:
    xpath: //select[@name='country']
    value: japan
```

---

## press

**カテゴリ**: インタラクション



### 使用例

```yaml
- press: Enter
```

---

## wait

**カテゴリ**: 待機



### 使用例

```yaml
- wait: <number>

- wait:
    css: "#login-button"

- wait:
    anyText: ログイン

- wait:
    xpath: //button[@type='submit']

- wait:
    load: networkidle

- wait:
    url: https://example.com

- wait:
    fn: () => document.readyState === "complete"
```

---

## screenshot

**カテゴリ**: キャプチャ



### 使用例

```yaml
- screenshot: ./screenshot.png

- screenshot:
    path: ./screenshot.png
    full: <unknown>
```

---

## assertVisible

**カテゴリ**: 検証



### 使用例

```yaml
- assertVisible: ログインボタン

- assertVisible:
    css: "#login-button"

- assertVisible:
    anyText: Welcome

- assertVisible:
    xpath: //button[@type='submit']
```

---

## assertNotVisible

**カテゴリ**: 検証



### 使用例

```yaml
- assertNotVisible: エラーメッセージ

- assertNotVisible:
    css: "#login-button"

- assertNotVisible:
    anyText: Welcome

- assertNotVisible:
    xpath: //button[@type='submit']
```

---

## assertEnabled

**カテゴリ**: 検証



### 使用例

```yaml
- assertEnabled: 送信ボタン

- assertEnabled:
    css: "#login-button"

- assertEnabled:
    interactableText: ログイン

- assertEnabled:
    xpath: //button[@type='submit']
```

---

## assertChecked

**カテゴリ**: 検証



### 使用例

```yaml
- assertChecked: 利用規約に同意

- assertChecked:
    css: "#agree-checkbox"
    checked: <unknown>

- assertChecked:
    interactableText: 利用規約に同意
    checked: <unknown>

- assertChecked:
    xpath: //input[@type='checkbox']
    checked: <unknown>
```

---

## eval

**カテゴリ**: その他



### 使用例

```yaml
- eval: console.log("hello")
```
