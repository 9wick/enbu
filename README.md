# enbu

[日本語版 README](https://github.com/9wick/enbu/README-ja.md)

> In martial arts, Enbu (演武) is a choreographed demonstration where practitioners perform predefined sequences of techniques. Similarly, Enbu lets you define test sequences in YAML and performs them in the browser — a rehearsal before production.

A simple E2E testing framework for web browsers. Define test flows in YAML format and leverage the powerful browser automation capabilities of [agent-browser](https://github.com/vercel-labs/agent-browser).

## Features

- **Readable YAML step definitions** - Write tests in a simple, human-readable format
- **Semantic element selection** - Locate elements by text, ARIA roles, labels, etc.
- **Auto-wait** - Automatically waits for elements to appear (no explicit sleeps needed)
- **Headless/Headed support** - Run tests in CI/CD or debug visually
- **Debug on failure** - Keep browser state open after test failures for debugging (you can even ask AI to investigate)
- **agent-browser integration** - Powered by a fast, Rust-based browser automation engine

## Prerequisites

You must have agent-browser installed.

```bash
# Install agent-browser (required)
npm install -g agent-browser
```

## Installation

```bash
npm install -g enbu
# or
npx enbu
```

## Quick Start

### 1. Initialize Your Project

```bash
npx enbu init
```

This creates a `.enbuflow/` directory with sample flows.

### 2. Create a Flow

`.enbuflow/login.enbu.yaml`:

```yaml
# Login flow test
steps:
  - open: https://example.com/login
  - click: Login
  - fill:
      text: Email
      value: user@example.com
  - fill:
      text: Password
      value: password123
  - click: Submit
  - assertVisible: Dashboard
```

### 3. Run Tests

```bash
# Run all flows
npx enbu

# Run a specific flow
npx enbu .enbuflow/login.enbu.yaml
```

## Command Reference

### Open Page

```yaml
steps:
  - open: https://example.com
```

### Click

```yaml
steps:
  # Text selector
  - click: Login

  # CSS selector
  - click:
      css: "#submit-button"
```

### Text Input

```yaml
steps:
  # fill: Clear input field then type
  - fill:
      text: Username
      value: John Doe

  # type: Append to existing text
  - type:
      text: Search box
      value: Additional text
```

### Key Press

```yaml
steps:
  # Press Enter key
  - press: Enter

  # Press Tab key
  - press: Tab
```

### Assertions

```yaml
steps:
  # Assert element is visible
  - assertVisible: Login successful

  # Assert element is not visible
  - assertNotVisible: Error

  # Assert element is enabled
  - assertEnabled: Submit button

  # Assert checkbox is checked
  - assertChecked: Accept terms

  # Assert checkbox is not checked
  - assertChecked:
      text: Optional feature
      checked: false
```

### Screenshot

```yaml
steps:
  # Regular screenshot
  - screenshot: ./screenshots/result.png

  # Full-page screenshot
  - screenshot:
      path: ./screenshots/fullpage.png
      full: true
```

### Scroll

```yaml
steps:
  # Scroll by direction
  - scroll:
      direction: down
      amount: 500

  # Scroll element into view
  - scrollIntoView: Footer
```

### Wait

```yaml
steps:
  # Wait milliseconds
  - wait: 2000

  # Wait for element to be visible
  - wait:
      css: "#loading-complete"

  # Wait for text to appear
  - wait:
      text: Loading complete

  # Wait for URL to change
  - wait:
      url: /dashboard

  # Wait for page load state
  - wait:
      load: networkidle
```

### JavaScript Execution

```yaml
steps:
  - eval: document.title

  # Multi-line
  - eval: |
      const element = document.querySelector('#result');
      return element.textContent;
```

## Documentation

### Command Reference

For a complete reference of all available commands and their options, see [docs/reference.md](./docs/REFERENCE.md).

This auto-generated document includes detailed usage examples for all 17+ supported commands across categories:

- **Navigation**: `open`, `scroll`, `scrollIntoView`
- **Interaction**: `click`, `hover`, `press`
- **Input**: `type`, `fill`, `select`
- **Wait**: `wait` (with multiple strategies)
- **Capture**: `screenshot`
- **Assertion**: `assertVisible`, `assertNotVisible`, `assertEnabled`, `assertChecked`
- **Other**: `eval`

### Examples

The [`example/`](./example/) directory contains working examples demonstrating all enbu commands organized by category:

- **[simple](./example/simple/)** (port 3000) - Basic navigation and assertions
- **[navigation](./example/navigation/)** (port 3010) - Page navigation, clicks, and hover
- **[form-input](./example/form-input/)** (port 3020) - Text input, key presses, and select boxes
- **[scroll](./example/scroll/)** (port 3030) - Scrolling and scroll-into-view
- **[utility](./example/utility/)** (port 3040) - Wait, screenshot, snapshot, and JavaScript execution
- **[assertions](./example/assertions/)** (port 3050) - All assertion commands

Each example includes a working Express server and `.enbuflow/` test files. See [example/README.md](./example/README.md) for how to run them.

## Environment Variables

You can use environment variables in your flows:

```yaml
env:
  PASSWORD: secret123
steps:
  - fill:
      text: Password
      value: ${PASSWORD}
```

### Ways to Specify Environment Variables

#### CLI Arguments

```bash
npx enbu --env PASSWORD=secret123
```

#### Define in YAML

`.enbuflow/login.enbu.yaml`:
```yaml
env:
  BASE_URL: https://staging.example.com
  PASSWORD: secret123
steps:
  - open: ${BASE_URL}/login
  - fill:
      text: Password
      value: ${PASSWORD}
```

## CLI Options

```bash
npx enbu [options] [flow-files...]

Options:
  --headed          Show browser while running (default: headless)
  --env KEY=VALUE   Set environment variable (can be used multiple times)
  --timeout <ms>    Default timeout (default: 30000)
  --screenshot      Save screenshot on failure
  --bail            Stop on first failure
  --session <name>  Specify agent-browser session name
  --parallel <N>    Run N flows in parallel
  -v, --verbose     Output detailed logs
  -h, --help        Show help
  -V, --version     Show version
```

## Directory Structure

```
your-project/
├── .enbuflow/
│   ├── login.enbu.yaml
│   ├── checkout.enbu.yaml
│   └── shared/
│       └── auth.enbu.yaml
└── package.json
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install agent-browser
        run: npm install -g agent-browser

      - name: Install browsers
        run: agent-browser install --with-deps

      - name: Run E2E tests
        run: npx enbu
        env:
          PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

## License

MIT
