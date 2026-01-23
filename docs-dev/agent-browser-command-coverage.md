# agent-browser Command Coverage

This document tracks the coverage status of [agent-browser](https://github.com/vercel-labs/agent-browser) commands in enbu's YAML syntax.

## Overview

Enbu allows you to use agent-browser commands from YAML. This table shows which commands are currently supported and their YAML syntax.

## Core Commands

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `open <url>` | ✅ | `- open: <url>` |
| `click <selector>` | ✅ | `- click: <selector>` |
| `dblclick <selector>` | ❌ | - |
| `focus <selector>` | ❌ | - |
| `type <selector> <text>` | ✅ | `- type: { selector: <selector>, value: <value> }` |
| `fill <selector> <text>` | ✅ | `- fill: { selector: <selector>, value: <value> }` |
| `press <key>` | ✅ | `- press: <key>` |
| `keydown <key>` | ❌ | - |
| `keyup <key>` | ❌ | - |
| `hover <selector>` | ✅ | `- hover: <selector>` |
| `select <selector> <value>` | ✅ | `- select: { selector: <selector>, value: <value> }` |
| `check <selector>` | ❌ | - |
| `uncheck <selector>` | ❌ | - |
| `scroll <direction> [px]` | ✅ | `- scroll: { direction: up\|down\|left\|right, amount: <px> }` |
| `scrollintoview <selector>` | ✅ | `- scrollIntoView: <selector>` |
| `drag <source> <target>` | ❌ | - |
| `upload <selector> <files>` | ❌ | - |
| `screenshot [path]` | ✅ | `- screenshot: <path>` or `{ path: <path>, full: true }` |
| `pdf <path>` | ❌ | - |
| `snapshot` | ✅ | `- snapshot: {}` |
| `eval <js>` | ✅ | `- eval: <script>` |
| `close` | ❌ | - |

## Get Info

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `get text <selector>` | ❌ | - |
| `get html <selector>` | ❌ | - |
| `get value <selector>` | ❌ | - |
| `get attr <selector> <attr>` | ❌ | - |
| `get title` | ❌ | - |
| `get url` | ❌ | - |
| `get count <selector>` | ❌ | - |
| `get box <selector>` | ❌ | - |

## Check State

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `is visible <selector>` | ✅ | `- assertVisible: <selector>` |
| `is enabled <selector>` | ✅ | `- assertEnabled: <selector>` |
| `is checked <selector>` | ✅ | `- assertChecked: <selector>` |

## Find Elements

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
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

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `wait <selector>` | ✅ | `- wait: "<selector>"` |
| `wait <ms>` | ✅ | `- wait: <ms>` |
| `wait --text <text>` | ✅ | `- wait: { text: "<text>" }` |
| `wait --url <pattern>` | ✅ | `- wait: { url: "<pattern>" }` |
| `wait --load <state>` | ✅ | `- wait: { load: "<state>" }` |
| `wait --fn <condition>` | ✅ | `- wait: { fn: "<condition>" }` |

## Mouse Control

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `mouse move <x> <y>` | ❌ | - |
| `mouse down [button]` | ❌ | - |
| `mouse up [button]` | ❌ | - |
| `mouse wheel <dy> [dx]` | ❌ | - |

## Browser Settings

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `set viewport <width> <height>` | ❌ | - |
| `set device <name>` | ❌ | - |
| `set geo <lat> <lng>` | ❌ | - |
| `set offline [on\|off]` | ❌ | - |
| `set headers <json>` | ❌ | - |
| `set credentials <user> <pass>` | ❌ | - |
| `set media [dark\|light]` | ❌ | - |

## Cookies & Storage

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
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

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `network route <url>` | ❌ | - |
| `network route <url> --abort` | ❌ | - |
| `network route <url> --body <json>` | ❌ | - |
| `network unroute [url]` | ❌ | - |
| `network requests` | ❌ | - |
| `network requests --filter <pattern>` | ❌ | - |

## Tabs & Windows

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `tab` | ❌ | - |
| `tab new [url]` | ❌ | - |
| `tab <n>` | ❌ | - |
| `tab close [n]` | ❌ | - |
| `window new` | ❌ | - |

## Frames

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `frame <selector>` | ❌ | - |
| `frame main` | ❌ | - |

## Dialogs

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `dialog accept [text]` | ❌ | - |
| `dialog dismiss` | ❌ | - |

## Debug

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
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

| agent-browser | Status | YAML Syntax |
|---------------|:------:|-------------|
| `back` | ❌ | - |
| `forward` | ❌ | - |
| `reload` | ❌ | - |

## enbu Custom Commands

| Command | YAML Syntax |
|---------|-------------|
| assertNotVisible | `- assertNotVisible: <selector>` |
