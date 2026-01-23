# Primary Directive

- Think in English, interact with the user in Japanese.

## Codebase Overview

enbu（演武）は、YAMLベースのブラウザE2Eテストフレームワークです。agent-browser（Rust製CLI）をラップし、人間が読みやすいYAML形式でテストフローを記述できます。

**Stack**: TypeScript, Nx, pnpm, Vitest, Valibot, neverthrow, ts-pattern, agent-browser

**Structure**:
- `apps/cli` - enbu CLI（npm公開）
- `apps/vscode-extension` - VS Code拡張（Test Explorer統合）
- `packages/core` - パーサー・エグゼキュータ・オーケストレータ
- `packages/agent-browser-adapter` - agent-browser CLIアダプター
- `example/` - 7カテゴリのサンプル（17コマンド対応）
- `tests/` - E2E・統合・ユニットテスト

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Fundamental Principles (Absolute Rules)
- **Prioritize actual code and actual data over theory.**
- Always correspond to the repository, actual code, and actual data.
- No matter how theoretically correct you think you are, if a user is reporting something, there is always a reason. Investigate the actual code and actual data precisely.
- **Fail fast** - implement early failure in the code.

## Interaction & Workflow Constraints (Pre-work Phase)
- **No General Statements:** General statements regarding the target repository are prohibited. You must respect the actual target repository and target filesystem before and during implementation.
- **Prohibition of Mocking:** Dummy code or NO-OP implementations are absolutely prohibited. If absolutely necessary, **you must stop work, explain, and obtain permission** first.
- **No Implicit Fallbacks:** Implicit fallbacks in logic are **absolutely forbidden**.

## Reporting Guidelines
- **No General Statements:** General statements are prohibited in reports. Ensure all findings correspond to the specific context of the repository.
- **Language:** Always provide reports in polite Japanese language.
- **Completeness:** Submit a complete report that readers can absolutely understand on its own.
- **No Omission:** In reports, omission of subjects (主語) is **absolutely forbidden**.
- **Reference Format:** When referencing source code in explanations, you must follow these rules:
    - For directories: present the directory name.
    - For existing files: present `filename:line_number(summary)`.
    - For Databases: always present table names, and column names/types if necessary.
- **Structure:** Summarize at the end of the report. In the final summary section, ensure that important elements can be viewed from a high-level perspective.

## Documentation & Specification Rules
- **TSDoc:** Always write detailed TSDoc **in Japanese**: purpose, content, and precautions.
- **Comments for Clarity:** If there's even slight complexity, describe details in comments **in Japanese** to reduce cognitive load so engineers outside the project can read it.
- **Precision:** When creating design documents or specifications, be strict and precise. Writing ambiguous sentences is absolutely forbidden.
- **Maintenance:** Update documentation when necessary.

## Test Code Guidelines
- **Readability Target:** **Ensure that even junior engineers outside the project can absolutely read it.** The behavior must be completely understandable just by reading the test code.
- **Context Documentation:** **Prerequisites, preconditions, and verification items must be documented in comments in Japanese.**
- **Test Data Naming:** **Use strings close to actual names for sample string literals. At the very least, use Japanese strings whose meaning is immediately clear.**

# Repository Guidelines

## Project Structure & Module Organization

This is an Nx workspace: applications live in `apps/`, shared libraries in `packages/`.

## Build, Test & Development Commands

- Nxはグローバルインストールなしで、必要に応じて `pnpm exec nx …`（または `pnpm nx …`）を使う。
- `pnpm run build` executes `nx run-many --target=build`。
- Quality gates: `pnpm run typecheck`、`pnpm run lint` / `pnpm run lint:check`、`pnpm run format` / `pnpm run format:check` (Biome)。
- Tests: `pnpm run test` runs Vitest unit tests. `pnpm run test:integration` runs integration tests. `pnpm run test:e2e` runs E2E tests. `pnpm run test:examples` runs example tests. `pnpm run test:coverage` runs coverage report.
- Utilities: `pnpm run clean` drops build artifacts and resets Nx cache; `clean:pnpm:modules` purges all `node_modules`. `pnpm run prepush` chains format → typecheck → lint → build → test → test:integration → test:e2e → test:examples.

## After your task finished
After completing your task, ensure to run `pnpm run prepush` to verify that all code quality checks pass before pushing your changes. This helps maintain the integrity of the codebase and prevents integration issues.

## Coding Style & Naming Conventions

Use TypeScript, 2-space indent, and Biome defaults (single quotes, trailing commas). ESLint's flat config blocks raw `console`. Files are PascalCase for types/classes, camelCase for functions/utilities. Shared helpers export from `packages/` with barrel files at `index.barrel.ts`.

- throwは禁止で、neverthrowをつかって型安全にResult型で扱う。
- 外部ライブラリのthrowはneverthrowのFromThrowableを使って、例外をResultに変換する。このとき、FromThrowableのscopeは最小となるように、外部ライブラリ以外を含まないようにする
- neverthrowはisOkやisErrで分岐せず、matchやmap、mapErr、andThenなどのメソッドチェーンで扱う。フローの要素は極力小さく、単純にし、関数に切り出す。ただし、副作用を伴う処理は関数に切り出さない。
- validationなどのは先に行い、副作用は最後にまとめる


純粋関数を基本とし、副作用は最小限に抑える。classは基本的に使用不可。
どうしてもstateフルな振る舞いが必要な場合に限り、classを使用するが、承認が必要。勝手に使うのは禁止。


## Testing Guidelines

Vitest multi-project config is defined in the root `vitest.config.ts`. Each app/package has its own `vitest.config.ts`. Co-locate `*.test.ts` with features. Reuse `example/` YAML fixtures for deterministic E2E runs. Run `pnpm run test:coverage` for coverage reports.

## Commit & Pull Request Guidelines

Commit messages follow the existing prefixes (`feat:`, `fix:`, `test:`, optional scopes like `feat(core): …`) and reference issues via `#123`. Keep commits focused, include one English summary line. Each PR must explain intent, highlight risky surfaces (YAML schema changes, agent-browser integration), and list manual QA or sample data used. Rerun `pnpm run prepush` before pushing.
