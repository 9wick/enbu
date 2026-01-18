# Phase 2: テスト仕様

このドキュメントは `@packages/core` のテストケースと受け入れ基準を定義します。

---

## テストファイル構成

```
packages/core/src/__tests__/
├── parser/
│   ├── yaml-parser.test.ts       # parseFlowYaml のテスト
│   └── env-resolver.test.ts      # resolveEnvVariables のテスト
└── loader/
    └── flow-loader.test.ts       # loadFlows のテスト
```

---

## テスト方針

### テストデータの配置

- `packages/core/src/__tests__/fixtures/` にテスト用YAMLファイルを配置
- 正常系、異常系のYAMLを用意
- 各テストケースで実際のファイルを読み込む

### テストデータの命名規約

```
fixtures/
├── valid/
│   ├── simple.enbu.yaml           # 基本的なフロー
│   ├── with-env.enbu.yaml         # env セクション付き
│   ├── all-commands.enbu.yaml     # 全コマンドを含む
│   └── multiple-vars.enbu.yaml    # 複数の環境変数
└── invalid/
    ├── syntax-error.enbu.yaml     # YAML構文エラー
    ├── no-commands.enbu.yaml      # コマンド配列なし
    ├── invalid-command.enbu.yaml  # 不正なコマンド
    └── undefined-var.enbu.yaml    # 未定義の環境変数
```

---

## yaml-parser.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| YP-1 | 基本的なフローのパース | `ok(Flow)` |
| YP-2 | envセクション付きフロー | env が正しく抽出される |
| YP-3 | 全コマンドを含むフロー | 全コマンド型が正しくパースされる |
| YP-4 | 簡略形式のコマンド | オブジェクト形式に正規化される |
| YP-5 | YAML構文エラー | `err({ type: 'yaml_syntax_error', ... })` |
| YP-6 | コマンド配列なし | `err({ type: 'invalid_flow_structure', ... })` |
| YP-7 | 不正なコマンド形式 | `err({ type: 'invalid_command', ... })` |
| YP-8 | 空のコマンド配列 | `err({ type: 'invalid_flow_structure', ... })` |

### テストコード

```typescript
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFlowYaml } from '../../parser/yaml-parser';

const FIXTURES_DIR = join(__dirname, '../fixtures');

/**
 * フィクスチャファイルを読み込むヘルパー
 */
const loadFixture = async (path: string): Promise<string> => {
  return readFile(join(FIXTURES_DIR, path), 'utf-8');
};

describe('parseFlowYaml', () => {
  /**
   * YP-1: 基本的なフローのパース
   *
   * 前提条件: valid/simple.enbu.yaml を読み込む
   * 検証項目:
   * - ok(Flow) が返される
   * - フロー名がファイル名から抽出される
   * - ステップが正しくパースされる
   */
  it('YP-1: 基本的なフローを正しくパースできる', async () => {
    // Arrange
    const yamlContent = await loadFixture('valid/simple.enbu.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'simple.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        expect(flow.name).toBe('simple');
        expect(flow.env).toEqual({});
        expect(flow.steps.length).toBeGreaterThan(0);
        expect(flow.steps[0].command).toBe('open');
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * YP-2: envセクション付きフロー
   *
   * 前提条件: valid/with-env.enbu.yaml を読み込む
   * 検証項目:
   * - env が正しく抽出される
   * - 全ての値が文字列として扱われる
   */
  it('YP-2: envセクションが正しく抽出される', async () => {
    // Arrange
    const yamlContent = await loadFixture('valid/with-env.enbu.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'with-env.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        expect(flow.env).toHaveProperty('BASE_URL');
        expect(flow.env.BASE_URL).toBe('https://example.com');
        expect(typeof flow.env.BASE_URL).toBe('string');
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * YP-3: 全コマンドを含むフロー
   *
   * 前提条件: valid/all-commands.enbu.yaml を読み込む
   * 検証項目:
   * - 全てのMVPコマンド型が正しくパースされる
   * - ステップ数が期待値と一致する
   */
  it('YP-3: 全てのコマンド型を正しくパースできる', async () => {
    // Arrange
    const yamlContent = await loadFixture('valid/all-commands.enbu.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'all-commands.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        // 全MVPコマンド（16種類）が含まれることを確認
        expect(flow.steps.length).toBe(16);

        // 各コマンド型の存在を確認
        const commands = flow.steps.map((step) => step.command);
        expect(commands).toContain('open');
        expect(commands).toContain('click');
        expect(commands).toContain('type');
        expect(commands).toContain('fill');
        expect(commands).toContain('press');
        expect(commands).toContain('hover');
        expect(commands).toContain('select');
        expect(commands).toContain('scroll');
        expect(commands).toContain('scrollIntoView');
        expect(commands).toContain('wait');
        expect(commands).toContain('screenshot');
        expect(commands).toContain('snapshot');
        expect(commands).toContain('eval');
        expect(commands).toContain('assertVisible');
        expect(commands).toContain('assertEnabled');
        expect(commands).toContain('assertChecked');
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * YP-4: 簡略形式のコマンド
   *
   * 前提条件: 簡略形式のYAML（- click: "ボタン"）
   * 検証項目:
   * - オブジェクト形式に正規化される
   * - { command: 'click', selector: "ボタン" } となる
   */
  it('YP-4: 簡略形式のコマンドが正規化される', () => {
    // Arrange
    const yamlContent = `
- click: "ログインボタン"
- open: https://example.com
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'test.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        expect(flow.steps[0]).toEqual({ command: 'click', selector: 'ログインボタン' });
        expect(flow.steps[1]).toEqual({ command: 'open', url: 'https://example.com' });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * YP-5: YAML構文エラー
   *
   * 前提条件: invalid/syntax-error.enbu.yaml を読み込む
   * 検証項目:
   * - err({ type: 'yaml_syntax_error', ... }) が返される
   * - line, column が含まれる
   */
  it('YP-5: YAML構文エラーでyaml_syntax_errorを返す', async () => {
    // Arrange
    const yamlContent = await loadFixture('invalid/syntax-error.enbu.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'syntax-error.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('yaml_syntax_error');
        expect(error.message).toBeTruthy();
      }
    );
  });

  /**
   * YP-6: コマンド配列なし
   *
   * 前提条件: invalid/no-commands.enbu.yaml を読み込む
   * 検証項目:
   * - err({ type: 'invalid_flow_structure', ... }) が返される
   */
  it('YP-6: コマンド配列がない場合、invalid_flow_structureを返す', async () => {
    // Arrange
    const yamlContent = await loadFixture('invalid/no-commands.enbu.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'no-commands.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_flow_structure');
        expect(error.message).toContain('no commands');
      }
    );
  });

  /**
   * YP-7: 不正なコマンド形式
   *
   * 前提条件: invalid/invalid-command.enbu.yaml を読み込む
   * 検証項目:
   * - err({ type: 'invalid_command', ... }) が返される
   * - commandIndex が含まれる
   */
  it('YP-7: 不正なコマンド形式でinvalid_commandを返す', async () => {
    // Arrange
    const yamlContent = await loadFixture('invalid/invalid-command.enbu.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'invalid-command.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_command');
        if (error.type === 'invalid_command') {
          expect(error.commandIndex).toBeGreaterThanOrEqual(0);
          expect(error.commandContent).toBeDefined();
        }
      }
    );
  });

  /**
   * YP-8: 空のコマンド配列
   *
   * 前提条件: コマンド配列が空のYAML
   * 検証項目:
   * - err({ type: 'invalid_flow_structure', ... }) が返される
   */
  it('YP-8: 空のコマンド配列でinvalid_flow_structureを返す', () => {
    // Arrange
    const yamlContent = '[]';

    // Act
    const result = parseFlowYaml(yamlContent, 'empty.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_flow_structure');
        expect(error.message).toContain('no commands');
      }
    );
  });
});
```

---

## env-resolver.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| ER-1 | 単一の環境変数展開 | `${VAR}` が正しく展開される |
| ER-2 | 複数の環境変数展開 | 複数の `${VAR}` が全て展開される |
| ER-3 | 環境変数の優先順位（processEnv） | processEnv が最優先 |
| ER-4 | 環境変数の優先順位（dotEnv） | dotEnv が flow.env より優先 |
| ER-5 | 環境変数の優先順位（flowEnv） | flowEnv が最後の選択肢 |
| ER-6 | 未定義の環境変数 | `err({ type: 'undefined_variable', ... })` |
| ER-7 | 環境変数なしのフロー | 変更なしで成功 |
| ER-8 | ネストされたオブジェクト内の変数 | 全てのプロパティが展開される |

### テストコード

```typescript
import { describe, it, expect } from 'vitest';
import { resolveEnvVariables } from '../../parser/env-resolver';
import type { Flow } from '../../types';

describe('resolveEnvVariables', () => {
  /**
   * ER-1: 単一の環境変数展開
   *
   * 前提条件: フローに ${BASE_URL} を含むステップ
   * 検証項目:
   * - ${BASE_URL} が正しく展開される
   * - 他のプロパティは変更されない
   */
  it('ER-1: 単一の環境変数を正しく展開できる', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${BASE_URL}' }],
    };
    const processEnv = { BASE_URL: 'https://example.com' };
    const dotEnv = {};

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps[0]).toEqual({
          command: 'open',
          url: 'https://example.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * ER-2: 複数の環境変数展開
   *
   * 前提条件: 1つの文字列に複数の変数参照
   * 検証項目:
   * - 全ての変数が正しく展開される
   */
  it('ER-2: 複数の環境変数を正しく展開できる', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${PROTOCOL}://${HOST}:${PORT}' }],
    };
    const processEnv = {
      PROTOCOL: 'https',
      HOST: 'example.com',
      PORT: '443',
    };
    const dotEnv = {};

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps[0]).toEqual({
          command: 'open',
          url: 'https://example.com:443',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * ER-3: 環境変数の優先順位（processEnv）
   *
   * 前提条件: 同じ変数名が複数のソースに存在
   * 検証項目:
   * - processEnv の値が使用される
   */
  it('ER-3: processEnvが最優先で使用される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: { BASE_URL: 'https://flow.example.com' },
      steps: [{ command: 'open', url: '${BASE_URL}' }],
    };
    const processEnv = { BASE_URL: 'https://process.example.com' };
    const dotEnv = { BASE_URL: 'https://dotenv.example.com' };

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps[0]).toEqual({
          command: 'open',
          url: 'https://process.example.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * ER-4: 環境変数の優先順位（dotEnv）
   *
   * 前提条件: processEnvに変数がなく、dotEnvとflow.envに存在
   * 検証項目:
   * - dotEnv の値が使用される
   */
  it('ER-4: dotEnvがflow.envより優先される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: { BASE_URL: 'https://flow.example.com' },
      steps: [{ command: 'open', url: '${BASE_URL}' }],
    };
    const processEnv = {};
    const dotEnv = { BASE_URL: 'https://dotenv.example.com' };

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps[0]).toEqual({
          command: 'open',
          url: 'https://dotenv.example.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * ER-5: 環境変数の優先順位（flowEnv）
   *
   * 前提条件: processEnvとdotEnvに変数がなく、flow.envのみ
   * 検証項目:
   * - flow.env の値が使用される
   */
  it('ER-5: flow.envが最後の選択肢として使用される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: { BASE_URL: 'https://flow.example.com' },
      steps: [{ command: 'open', url: '${BASE_URL}' }],
    };
    const processEnv = {};
    const dotEnv = {};

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps[0]).toEqual({
          command: 'open',
          url: 'https://flow.example.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * ER-6: 未定義の環境変数
   *
   * 前提条件: どのソースにも存在しない変数を参照
   * 検証項目:
   * - err({ type: 'undefined_variable', ... }) が返される
   * - variableName, location が含まれる
   */
  it('ER-6: 未定義の環境変数でundefined_variableを返す', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${UNDEFINED_VAR}' }],
    };
    const processEnv = {};
    const dotEnv = {};

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('undefined_variable');
        if (error.type === 'undefined_variable') {
          expect(error.variableName).toBe('UNDEFINED_VAR');
          expect(error.location).toBeTruthy();
        }
      }
    );
  });

  /**
   * ER-7: 環境変数なしのフロー
   *
   * 前提条件: 変数参照を含まないフロー
   * 検証項目:
   * - 変更なしで成功
   * - ステップが元のまま
   */
  it('ER-7: 環境変数なしのフローは変更なしで成功', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [
        { command: 'open', url: 'https://example.com' },
        { command: 'click', selector: 'ボタン' },
      ],
    };
    const processEnv = {};
    const dotEnv = {};

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps).toEqual(flow.steps);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * ER-8: ネストされたオブジェクト内の変数
   *
   * 前提条件: typeコマンドのような複数プロパティを持つステップ
   * 検証項目:
   * - 全てのプロパティが展開される
   */
  it('ER-8: ネストされたオブジェクト内の変数を展開できる', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [
        {
          command: 'type',
          selector: '${SELECTOR}',
          text: '${TEXT}',
        },
      ],
    };
    const processEnv = {
      SELECTOR: 'メールアドレス',
      TEXT: 'test@example.com',
    };
    const dotEnv = {};

    // Act
    const result = resolveEnvVariables(flow, processEnv, dotEnv);

    // Assert
    result.match(
      (resolved) => {
        expect(resolved.steps[0]).toEqual({
          command: 'type',
          selector: 'メールアドレス',
          text: 'test@example.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });
});
```

---

## flow-loader.test.ts

### テストケース一覧

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| FL-1 | 単一ファイルの読み込み | `ok([Flow])` |
| FL-2 | 複数ファイルの読み込み | 全てのフローが読み込まれる |
| FL-3 | ファイル名順のソート | ソート順に読み込まれる |
| FL-4 | .envファイルの読み込み | dotEnvの値が使用される |
| FL-5 | ファイル読み込みエラー | `err({ type: 'file_read_error', ... })` |
| FL-6 | 空のディレクトリ | `ok([])` |
| FL-7 | パースエラーのあるファイル | 最初のエラーが返される |

### テストコード

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadFlows } from '../../loader/flow-loader';

const TEST_DIR = join(__dirname, '../temp-flows');

describe('loadFlows', () => {
  beforeEach(async () => {
    // テスト用ディレクトリを作成
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // テスト用ディレクトリを削除
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  /**
   * FL-1: 単一ファイルの読み込み
   *
   * 前提条件: 1つの有効なフローファイル
   * 検証項目:
   * - ok([Flow]) が返される
   * - フローが正しくパースされる
   */
  it('FL-1: 単一ファイルを正しく読み込める', async () => {
    // Arrange
    const yamlContent = `
- open: https://example.com
- click: "ボタン"
`;
    await writeFile(join(TEST_DIR, 'test.enbu.yaml'), yamlContent);

    // Act
    const result = await loadFlows(TEST_DIR);

    // Assert
    result.match(
      (flows) => {
        expect(flows.length).toBe(1);
        expect(flows[0].name).toBe('test');
        expect(flows[0].steps.length).toBe(2);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * FL-2: 複数ファイルの読み込み
   *
   * 前提条件: 複数の有効なフローファイル
   * 検証項目:
   * - 全てのフローが読み込まれる
   */
  it('FL-2: 複数ファイルを正しく読み込める', async () => {
    // Arrange
    await writeFile(
      join(TEST_DIR, 'flow1.enbu.yaml'),
      '- open: https://example1.com'
    );
    await writeFile(
      join(TEST_DIR, 'flow2.enbu.yaml'),
      '- open: https://example2.com'
    );
    await writeFile(
      join(TEST_DIR, 'flow3.enbu.yaml'),
      '- open: https://example3.com'
    );

    // Act
    const result = await loadFlows(TEST_DIR);

    // Assert
    result.match(
      (flows) => {
        expect(flows.length).toBe(3);
        const names = flows.map((f) => f.name);
        expect(names).toContain('flow1');
        expect(names).toContain('flow2');
        expect(names).toContain('flow3');
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * FL-3: ファイル名順のソート
   *
   * 前提条件: 複数のフローファイル
   * 検証項目:
   * - ファイル名のアルファベット順に読み込まれる
   */
  it('FL-3: ファイル名順にソートされる', async () => {
    // Arrange
    await writeFile(join(TEST_DIR, 'c.enbu.yaml'), '- open: c');
    await writeFile(join(TEST_DIR, 'a.enbu.yaml'), '- open: a');
    await writeFile(join(TEST_DIR, 'b.enbu.yaml'), '- open: b');

    // Act
    const result = await loadFlows(TEST_DIR);

    // Assert
    result.match(
      (flows) => {
        const names = flows.map((f) => f.name);
        expect(names).toEqual(['a', 'b', 'c']);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * FL-4: .envファイルの読み込み
   *
   * 前提条件: .envファイルが存在
   * 検証項目:
   * - dotEnvの値が使用される
   */
  it('FL-4: .envファイルの値が使用される', async () => {
    // Arrange
    const yamlContent = '- open: ${BASE_URL}';
    const envContent = 'BASE_URL=https://from-dotenv.com';

    await writeFile(join(TEST_DIR, 'test.enbu.yaml'), yamlContent);
    await writeFile(join(TEST_DIR, '.env'), envContent);

    // Act
    const result = await loadFlows(TEST_DIR, {
      processEnv: {},
      dotEnvPath: join(TEST_DIR, '.env'),
    });

    // Assert
    result.match(
      (flows) => {
        expect(flows[0].steps[0]).toEqual({
          command: 'open',
          url: 'https://from-dotenv.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * FL-5: ファイル読み込みエラー
   *
   * 前提条件: 存在しないディレクトリ
   * 検証項目:
   * - err({ type: 'file_read_error', ... }) が返される
   */
  it('FL-5: 存在しないディレクトリでfile_read_errorを返す', async () => {
    // Arrange
    const nonExistentDir = join(TEST_DIR, 'non-existent');

    // Act
    const result = await loadFlows(nonExistentDir);

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('file_read_error');
        if (error.type === 'file_read_error') {
          expect(error.filePath).toBe(nonExistentDir);
        }
      }
    );
  });

  /**
   * FL-6: 空のディレクトリ
   *
   * 前提条件: *.enbu.yamlファイルが存在しない
   * 検証項目:
   * - ok([]) が返される
   */
  it('FL-6: 空のディレクトリでは空配列を返す', async () => {
    // Arrange: ディレクトリは存在するがファイルなし

    // Act
    const result = await loadFlows(TEST_DIR);

    // Assert
    result.match(
      (flows) => {
        expect(flows.length).toBe(0);
      },
      () => {
        throw new Error('Expected ok result');
      }
    );
  });

  /**
   * FL-7: パースエラーのあるファイル
   *
   * 前提条件: 複数ファイルのうち1つにパースエラー
   * 検証項目:
   * - 最初のエラーが返される
   * - エラー発生後の処理は停止
   */
  it('FL-7: パースエラーのあるファイルで最初のエラーを返す', async () => {
    // Arrange
    await writeFile(join(TEST_DIR, 'valid.enbu.yaml'), '- open: https://example.com');
    await writeFile(join(TEST_DIR, 'invalid.enbu.yaml'), 'invalid: yaml: syntax: {{{');

    // Act
    const result = await loadFlows(TEST_DIR);

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        // パースエラーまたはファイルエラー
        expect(['yaml_syntax_error', 'invalid_flow_structure', 'invalid_command']).toContain(
          error.type
        );
      }
    );
  });
});
```

---

## 受け入れ基準チェックリスト

Phase 2 完了時に以下を全て満たすこと:

### 機能要件 - YAMLパーサー

- [ ] **YP-1**: `parseFlowYaml()` が基本的なフローをパースできる
- [ ] **YP-2**: `parseFlowYaml()` が env セクションを正しく抽出できる
- [ ] **YP-3**: `parseFlowYaml()` が全MVPコマンドをパースできる
- [ ] **YP-4**: `parseFlowYaml()` が簡略形式を正規化できる
- [ ] **YP-5**: `parseFlowYaml()` がYAML構文エラーで `yaml_syntax_error` を返す
- [ ] **YP-6**: `parseFlowYaml()` がコマンド配列なしで `invalid_flow_structure` を返す
- [ ] **YP-7**: `parseFlowYaml()` が不正なコマンドで `invalid_command` を返す
- [ ] **YP-8**: `parseFlowYaml()` が空配列で `invalid_flow_structure` を返す

### 機能要件 - 環境変数リゾルバー

- [ ] **ER-1**: `resolveEnvVariables()` が単一の環境変数を展開できる
- [ ] **ER-2**: `resolveEnvVariables()` が複数の環境変数を展開できる
- [ ] **ER-3**: `resolveEnvVariables()` で processEnv が最優先される
- [ ] **ER-4**: `resolveEnvVariables()` で dotEnv が flow.env より優先される
- [ ] **ER-5**: `resolveEnvVariables()` で flow.env が最後の選択肢となる
- [ ] **ER-6**: `resolveEnvVariables()` が未定義変数で `undefined_variable` を返す
- [ ] **ER-7**: `resolveEnvVariables()` が環境変数なしのフローで成功する
- [ ] **ER-8**: `resolveEnvVariables()` がネストされたプロパティを展開できる

### 機能要件 - フローローダー

- [ ] **FL-1**: `loadFlows()` が単一ファイルを読み込める
- [ ] **FL-2**: `loadFlows()` が複数ファイルを読み込める
- [ ] **FL-3**: `loadFlows()` がファイル名順にソートする
- [ ] **FL-4**: `loadFlows()` が .env ファイルの値を使用する
- [ ] **FL-5**: `loadFlows()` が読み込みエラーで `file_read_error` を返す
- [ ] **FL-6**: `loadFlows()` が空ディレクトリで空配列を返す
- [ ] **FL-7**: `loadFlows()` がパースエラー時に最初のエラーを返す

### 品質要件

- [ ] 全テストが `pnpm run test` でパスする
- [ ] `pnpm run typecheck` でエラーがない
- [ ] `pnpm run lint` でエラーがない
- [ ] `pnpm run prepush` が成功する

### 公開API要件

- [ ] `API.md` に定義された全ての関数がexportされている
- [ ] `API.md` に定義された全ての型がexportされている
- [ ] 全ての戻り値が `Result` 型でラップされている
- [ ] 全てのMVPコマンド型が定義されている

### ドキュメント要件

- [ ] 全ての関数にTSDocが記述されている（日本語）
- [ ] 型ガード関数にコメントが記述されている
- [ ] テストコードに前提条件・検証項目が記述されている
- [ ] サンプルデータに意味のある日本語が使用されている
