## 0.4.0 (2026-01-23)

### 🚀 Features

- add @nx/js dependency to devDependencies ([f4f3054](https://github.com/9wick/enbu/commit/f4f3054))

## 0.2.0 (2026-01-18)

### 🚀 Features

- **release:** add Nx Release configuration ([9cc1230](https://github.com/9wick/enbu/commit/9cc1230))
- **cli:** add npm publish configuration ([741fbf3](https://github.com/9wick/enbu/commit/741fbf3))
- **vscode:** add VS Code extension for flow visualization ([f4b7c55](https://github.com/9wick/enbu/commit/f4b7c55))
- **ci:** add example flow tests to CI and prepush ([a48181e](https://github.com/9wick/enbu/commit/a48181e))
- rename project to enbu and change extension to .enbu.yaml ([c9d8f1e](https://github.com/9wick/enbu/commit/c9d8f1e))
- **core:** support all wait command short forms and update README ([6e62f1c](https://github.com/9wick/enbu/commit/6e62f1c))
- **example:** add comprehensive test examples and fix scrollIntoView autoWait ([36f5f7a](https://github.com/9wick/enbu/commit/36f5f7a))
- **example:** add comprehensive test examples and fix scrollIntoView autoWait ([26cc7a3](https://github.com/9wick/enbu/commit/26cc7a3))
- **cli:** add session management with debug info on failure ([d41734e](https://github.com/9wick/enbu/commit/d41734e))
- **core:** add assertNotVisible command and --version CLI flag ([d196543](https://github.com/9wick/enbu/commit/d196543))
- **cli:** implement full CLI with init/run commands and argument parsing ([47d288e](https://github.com/9wick/enbu/commit/47d288e))
- **core:** add flow executor with command handlers and auto-wait support ([f2a284a](https://github.com/9wick/enbu/commit/f2a284a))
- **core:** add YAML flow parser, loader, and type system ([3b57442](https://github.com/9wick/enbu/commit/3b57442))

### 🩹 Fixes

- **cli:** bundle all dependencies with noExternal ([c4a354d](https://github.com/9wick/enbu/commit/c4a354d))
- **vscode:** add launch.json to monorepo root for debugging ([fdcf122](https://github.com/9wick/enbu/commit/fdcf122))
- **ci:** use agent-browser install instead of playwright ([7084f74](https://github.com/9wick/enbu/commit/7084f74))
- **ci:** add Playwright browser installation step ([414bad8](https://github.com/9wick/enbu/commit/414bad8))
- **e2e:** fix E2E tests with dynamic ports and supported assertions ([5a29d50](https://github.com/9wick/enbu/commit/5a29d50))
- **ci:** replace cargo install with npm for agent-browser ([6fa92f7](https://github.com/9wick/enbu/commit/6fa92f7))
- **ci:** remove hardcoded pnpm version to use packageManager field ([98cb764](https://github.com/9wick/enbu/commit/98cb764))
- **core:** align screenshot and scroll commands with agent-browser CLI ([7c0ce5e](https://github.com/9wick/enbu/commit/7c0ce5e))
- **example:** use relative path for CLI execution to fix clean install ([7f7e049](https://github.com/9wick/enbu/commit/7f7e049))