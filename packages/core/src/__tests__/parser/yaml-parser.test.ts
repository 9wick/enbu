import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFlowYaml } from '../../parser/yaml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
      },
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
      },
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
        // 全MVPコマンド（17種類）が含まれることを確認
        expect(flow.steps.length).toBe(17);

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
        expect(commands).toContain('assertNotVisible');
        expect(commands).toContain('assertEnabled');
        expect(commands).toContain('assertChecked');
      },
      () => {
        throw new Error('Expected ok result');
      },
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
steps:
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
      },
    );
  });

  /**
   * YP-5: YAML構文エラー
   *
   * 前提条件: invalid/syntax-error.enbu.yaml を読み込む
   * 検証項目:
   * - err({ type: 'yaml_syntax_error', ... }) が返される
   * - message が含まれる
   *
   * 注意: yamlライブラリは多くの構文エラーを許容するため、
   * このテストは実際にdocument.errorsに格納されるエラーをチェックする
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
      },
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
      },
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
      },
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
    const yamlContent = 'steps: []';

    // Act
    const result = parseFlowYaml(yamlContent, 'empty.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_flow_structure');
      },
    );
  });

  /**
   * YP-9: assertCheckedコマンドのcheckedフィールドをパースできる
   *
   * 前提条件: checked: falseを含むassertCheckedコマンド
   * 検証項目:
   * - ok(Flow) が返される
   * - checkedフィールドがfalseとして正しくパースされる
   */
  it('YP-9: assertCheckedコマンドのcheckedフィールドを正しくパースできる', () => {
    // Arrange: checked: falseを持つassertCheckedコマンド
    const yamlContent = `
steps:
  - assertChecked:
      selector: "チェックボックス"
      checked: false
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'assert-checked.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        expect(flow.steps.length).toBe(1);
        const command = flow.steps[0];
        expect(command.command).toBe('assertChecked');
        if (command.command === 'assertChecked') {
          expect(command.selector).toBe('チェックボックス');
          expect(command.checked).toBe(false);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * YP-10: assertCheckedコマンドのcheckedフィールドがtrueの場合も正しくパースできる
   *
   * 前提条件: checked: trueを含むassertCheckedコマンド
   * 検証項目:
   * - ok(Flow) が返される
   * - checkedフィールドがtrueとして正しくパースされる
   */
  it('YP-10: assertCheckedコマンドのcheckedフィールド(true)を正しくパースできる', () => {
    // Arrange: checked: trueを持つassertCheckedコマンド
    const yamlContent = `
steps:
  - assertChecked:
      selector: "同意チェックボックス"
      checked: true
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'assert-checked-true.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        expect(flow.steps.length).toBe(1);
        const command = flow.steps[0];
        expect(command.command).toBe('assertChecked');
        if (command.command === 'assertChecked') {
          expect(command.selector).toBe('同意チェックボックス');
          expect(command.checked).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * YP-11: assertCheckedコマンドでcheckedフィールドが省略された場合
   *
   * 前提条件: checkedフィールドが省略されたassertCheckedコマンド
   * 検証項目:
   * - ok(Flow) が返される
   * - checkedフィールドがundefinedである
   */
  it('YP-11: assertCheckedコマンドでcheckedフィールドが省略された場合は正しくパースできる', () => {
    // Arrange: checkedフィールドが省略されたassertCheckedコマンド
    const yamlContent = `
steps:
  - assertChecked:
      selector: "規約チェックボックス"
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'assert-checked-omit.enbu.yaml');

    // Assert
    result.match(
      (flow) => {
        expect(flow.steps.length).toBe(1);
        const command = flow.steps[0];
        expect(command.command).toBe('assertChecked');
        if (command.command === 'assertChecked') {
          expect(command.selector).toBe('規約チェックボックス');
          expect(command.checked).toBeUndefined();
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * YP-12: assertCheckedコマンドでcheckedフィールドが文字列の場合はエラー
   *
   * 前提条件: checked: "yes"（文字列）を含むassertCheckedコマンド
   * 検証項目:
   * - err({ type: 'invalid_command', ... }) が返される
   */
  it('YP-12: assertCheckedコマンドでcheckedフィールドが文字列の場合はエラーを返す', () => {
    // Arrange: checkedフィールドが文字列のassertCheckedコマンド
    const yamlContent = `
steps:
  - assertChecked:
      selector: "チェックボックス"
      checked: "yes"
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'assert-checked-invalid.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_command');
      },
    );
  });

  /**
   * YP-13: assertCheckedコマンドでcheckedフィールドが数値の場合はエラー
   *
   * 前提条件: checked: 1（数値）を含むassertCheckedコマンド
   * 検証項目:
   * - err({ type: 'invalid_command', ... }) が返される
   */
  it('YP-13: assertCheckedコマンドでcheckedフィールドが数値の場合はエラーを返す', () => {
    // Arrange: checkedフィールドが数値のassertCheckedコマンド
    const yamlContent = `
steps:
  - assertChecked:
      selector: "チェックボックス"
      checked: 1
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'assert-checked-number.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_command');
      },
    );
  });

  /**
   * YP-14: assertCheckedコマンドでcheckedフィールドがnullの場合はエラー
   *
   * 前提条件: checked: null を含むassertCheckedコマンド
   * 検証項目:
   * - err({ type: 'invalid_command', ... }) が返される
   */
  it('YP-14: assertCheckedコマンドでcheckedフィールドがnullの場合はエラーを返す', () => {
    // Arrange: checkedフィールドがnullのassertCheckedコマンド
    const yamlContent = `
steps:
  - assertChecked:
      selector: "チェックボックス"
      checked: null
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'assert-checked-null.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_command');
      },
    );
  });

  /**
   * YP-15: 旧形式（配列形式）はエラーを返す
   *
   * 前提条件: ルートが配列形式のYAML
   * 検証項目:
   * - err({ type: 'invalid_flow_structure', ... }) が返される
   * - エラーメッセージに「配列形式はサポートされていない」旨が含まれる
   */
  it('YP-15: 旧形式（配列形式）はinvalid_flow_structureを返す', () => {
    // Arrange: 旧形式の配列形式
    const yamlContent = `
- open: https://example.com
- click: "ボタン"
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'old-format.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_flow_structure');
        expect(error.message).toContain('not an array');
      },
    );
  });

  /**
   * YP-16: stepsが配列でない場合はエラーを返す
   *
   * 前提条件: stepsが文字列のYAML
   * 検証項目:
   * - err({ type: 'invalid_flow_structure', ... }) が返される
   */
  it('YP-16: stepsが配列でない場合はinvalid_flow_structureを返す', () => {
    // Arrange: stepsが文字列
    const yamlContent = `
steps: "not an array"
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'invalid-steps.enbu.yaml');

    // Assert
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_flow_structure');
        expect(error.message).toContain('must be an array');
      },
    );
  });
});
