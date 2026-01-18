# @enbu/schema

JSON Schema for enbu YAML files.

## Installation

```bash
npm install @enbu/schema
```

## Usage

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "node_modules/@enbu/schema/dist/flow.schema.json": "**/*.enbu.yaml"
  }
}
```

### Direct reference in YAML

```yaml
# yaml-language-server: $schema=node_modules/@enbu/schema/dist/flow.schema.json
steps:
  - open: https://example.com
  - assertVisible: Welcome
```

## Schema URL

You can also reference the schema directly:

```
https://enbu.dev/schemas/flow.schema.json
```
