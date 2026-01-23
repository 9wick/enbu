# YAML Flow Reference

This document is auto-generated from Valibot schemas.

## open

**Category**: Navigation



### Usage Examples

```yaml
- open: https://example.com
```

---

## scroll

**Category**: Navigation



### Usage Examples

```yaml
- scroll:
    direction: up
    amount: <number>
```

---

## scrollIntoView

**Category**: Navigation



### Usage Examples

```yaml
- scrollIntoView: Submit button

- scrollIntoView:
    css: "#login-button"

- scrollIntoView:
    anyText: Welcome

- scrollIntoView:
    xpath: //button[@type='submit']
```

---

## click

**Category**: Interaction



### Usage Examples

```yaml
- click: Login

- click:
    css: "#login-button"

- click:
    interactableText: Login

- click:
    xpath: //button[@type='submit']
```

---

## hover

**Category**: Interaction



### Usage Examples

```yaml
- hover: Login

- hover:
    css: "#login-button"

- hover:
    interactableText: Login

- hover:
    xpath: //button[@type='submit']
```

---

## type

**Category**: Input



### Usage Examples

```yaml
- type:
    css: "#username"
    value: Username

- type:
    interactableText: Email address
    value: Username

- type:
    xpath: //input[@name='email']
    value: Username
```

---

## fill

**Category**: Input



### Usage Examples

```yaml
- fill:
    css: "#email"
    value: New username

- fill:
    interactableText: Email address
    value: New username

- fill:
    xpath: //input[@type='password']
    value: New username
```

---

## select

**Category**: Input



### Usage Examples

```yaml
- select:
    css: "#country"
    value: japan

- select:
    interactableText: Select country
    value: japan

- select:
    xpath: //select[@name='country']
    value: japan
```

---

## press

**Category**: Interaction



### Usage Examples

```yaml
- press: Enter
```

---

## wait

**Category**: Wait



### Usage Examples

```yaml
- wait: <number>

- wait:
    css: "#login-button"

- wait:
    anyText: Login

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

**Category**: Capture



### Usage Examples

```yaml
- screenshot: ./screenshot.png

- screenshot:
    path: ./screenshot.png
    full: <boolean>
```

---

## assertVisible

**Category**: Assertion



### Usage Examples

```yaml
- assertVisible: Login button

- assertVisible:
    css: "#login-button"

- assertVisible:
    anyText: Welcome

- assertVisible:
    xpath: //button[@type='submit']
```

---

## assertNotVisible

**Category**: Assertion



### Usage Examples

```yaml
- assertNotVisible: Error message

- assertNotVisible:
    css: "#login-button"

- assertNotVisible:
    anyText: Welcome

- assertNotVisible:
    xpath: //button[@type='submit']
```

---

## assertEnabled

**Category**: Assertion



### Usage Examples

```yaml
- assertEnabled: Submit button

- assertEnabled:
    css: "#login-button"

- assertEnabled:
    interactableText: Login

- assertEnabled:
    xpath: //button[@type='submit']
```

---

## assertChecked

**Category**: Assertion



### Usage Examples

```yaml
- assertChecked: Agree to terms

- assertChecked:
    css: "#agree-checkbox"
    checked: <boolean>

- assertChecked:
    interactableText: Agree to terms
    checked: <boolean>

- assertChecked:
    xpath: //input[@type='checkbox']
    checked: <boolean>
```

---

## eval

**Category**: Other



### Usage Examples

```yaml
- eval: console.log("hello")
```
