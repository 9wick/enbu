# @agent-browser-flow/schema

JSON Schema for agent-browser-flow YAML files.

## Installation

```bash
npm install @agent-browser-flow/schema
```

## Usage

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "node_modules/@agent-browser-flow/schema/dist/flow.schema.json": "**/*.flow.yaml"
  }
}
```

### Direct reference in YAML

```yaml
# yaml-language-server: $schema=node_modules/@agent-browser-flow/schema/dist/flow.schema.json
steps:
  - open: https://example.com
  - assertVisible: Welcome
```

## Schema URL

You can also reference the schema directly:

```
https://agent-browser-flow.dev/schemas/flow.schema.json
```
