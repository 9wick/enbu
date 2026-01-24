# agent-browser コマンド対応表

このドキュメントは、enbuのYAML構文における [agent-browser](https://github.com/vercel-labs/agent-browser) コマンドの対応状況を追跡します。

## 概要

enbuはagent-browserのコマンドをYAMLから利用できます。この表は、現在サポートされているコマンドとそのYAML記法を示しています。

## Core Commands

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `open <url>` | ✅ | `- open: <url>` |
| `click <selector>` | ✅ | `- click: <selector>` |
| `dblclick <selector>` | ✅ | `- dblclick: <selector>` または `{ css\|text\|xpath: <selector> }` |
| `focus <selector>` | ✅ | `- focus: <selector>` または `{ css\|text\|xpath: <selector> }` |
| `type <selector> <text>` | ✅ | `- type: { selector: <selector>, value: <value> }` |
| `fill <selector> <text>` | ✅ | `- fill: { selector: <selector>, value: <value> }` |
| `press <key>` | ✅ | `- press: <key>` |
| `keydown <key>` | ✅ | `- keydown: <key>` |
| `keyup <key>` | ✅ | `- keyup: <key>` |
| `hover <selector>` | ✅ | `- hover: <selector>` |
| `select <selector> <value>` | ✅ | `- select: { selector: <selector>, value: <value> }` |
| `check <selector>` | ✅ | `- check: <selector>` または `{ css\|text\|xpath: <selector> }` |
| `uncheck <selector>` | ✅ | `- uncheck: <selector>` または `{ css\|text\|xpath: <selector> }` |
| `scroll <direction> [px]` | ✅ | `- scroll: { direction: up\|down\|left\|right, amount: <px> }` |
| `scrollintoview <selector>` | ✅ | `- scrollIntoView: <selector>` |
| `drag <source> <target>` | ✅ | `- drag: { source: { css\|text\|xpath: <selector> }, target: { css\|text\|xpath: <selector> } }` |
| `upload <selector> <files>` | ✅ | `- upload: { css\|text\|xpath: <selector>, files: <path> \| [<path1>, <path2>] }` |
| `screenshot [path]` | ✅ | `- screenshot: <path>` または `{ path: <path>, full: true }` |
| `pdf <path>` | ✅ | `- pdf: <path>` または `{ path: <path> }` |
| `snapshot` | ✅ | `- snapshot: {}` |
| `eval <js>` | ✅ | `- eval: <script>` |
| `close` | N/A | 自動でcloseされるため実装不要 |

## Get Info

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `get text <selector>` | ❌ | - |
| `get html <selector>` | ❌ | - |
| `get value <selector>` | ❌ | - |
| `get attr <selector> <attr>` | ❌ | - |
| `get title` | ❌ | - |
| `get url` | ❌ | - |
| `get count <selector>` | ❌ | - |
| `get box <selector>` | ❌ | - |

## Check State

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `is visible <selector>` | ✅ | `- assertVisible: <selector>` |
| `is enabled <selector>` | ✅ | `- assertEnabled: <selector>` |
| `is checked <selector>` | ✅ | `- assertChecked: <selector>` |

## Find Elements

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `find role <role> <action> [value]` | ❌ | - |
| `find text <text> <action>` | ❌ | - |
| `find label <label> <action> [value]` | ❌ | - |
| `find placeholder <placeholder> <action> [value]` | ❌ | - |
| `find alt <text> <action>` | ❌ | - |
| `find title <text> <action>` | ❌ | - |
| `find testid <id> <action> [value]` | ❌ | - |
| `find first <selector> <action> [value]` | ❌ | - |
| `find last <selector> <action> [value]` | ❌ | - |
| `find nth <n> <selector> <action> [value]` | ❌ | - |

## Wait

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `wait <selector>` | ✅ | `- wait: "<selector>"` |
| `wait <ms>` | ✅ | `- wait: <ms>` |
| `wait --text <text>` | ✅ | `- wait: { text: "<text>" }` |
| `wait --url <pattern>` | ✅ | `- wait: { url: "<pattern>" }` |
| `wait --load <state>` | ✅ | `- wait: { load: "<state>" }` |
| `wait --fn <condition>` | ✅ | `- wait: { fn: "<condition>" }` |

## Mouse Control

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `mouse move <x> <y>` | ❌ | - |
| `mouse down [button]` | ❌ | - |
| `mouse up [button]` | ❌ | - |
| `mouse wheel <dy> [dx]` | ❌ | - |

## Browser Settings

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `set viewport <width> <height>` | ❌ | - |
| `set device <name>` | ❌ | - |
| `set geo <lat> <lng>` | ❌ | - |
| `set offline [on\|off]` | ❌ | - |
| `set headers <json>` | ❌ | - |
| `set credentials <user> <pass>` | ❌ | - |
| `set media [dark\|light]` | ❌ | - |

## Cookies & Storage

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `cookies` | ❌ | - |
| `cookies set <name> <value>` | ❌ | - |
| `cookies clear` | ❌ | - |
| `storage local` | ❌ | - |
| `storage local <key>` | ❌ | - |
| `storage local set <key> <value>` | ❌ | - |
| `storage local clear` | ❌ | - |
| `storage session` | ❌ | - |
| `storage session <key>` | ❌ | - |
| `storage session set <key> <value>` | ❌ | - |
| `storage session clear` | ❌ | - |

## Network

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `network route <url>` | ❌ | - |
| `network route <url> --abort` | ❌ | - |
| `network route <url> --body <json>` | ❌ | - |
| `network unroute [url]` | ❌ | - |
| `network requests` | ❌ | - |
| `network requests --filter <pattern>` | ❌ | - |

## Tabs & Windows

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `tab` | ❌ | - |
| `tab new [url]` | ❌ | - |
| `tab <n>` | ❌ | - |
| `tab close [n]` | ❌ | - |
| `window new` | ❌ | - |

## Frames

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `frame <selector>` | ❌ | - |
| `frame main` | ❌ | - |

## Dialogs

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `dialog accept [text]` | ❌ | - |
| `dialog dismiss` | ❌ | - |

## Debug

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `trace start [path]` | ❌ | - |
| `trace stop [path]` | ❌ | - |
| `console` | ❌ | - |
| `console --clear` | ❌ | - |
| `errors` | ❌ | - |
| `errors --clear` | ❌ | - |
| `highlight <selector>` | ❌ | - |
| `state save <path>` | ❌ | - |
| `state load <path>` | ❌ | - |

## Navigation

| agent-browser | 対応 | YAML記法 |
|---------------|:----:|----------|
| `back` | ❌ | - |
| `forward` | ❌ | - |
| `reload` | ❌ | - |

## enbu 独自コマンド

| コマンド | YAML記法 |
|----------|----------|
| assertNotVisible | `- assertNotVisible: <selector>` |
