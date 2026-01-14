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
   * 前提条件: valid/simple.flow.yaml を読み込む
   * 検証項目:
   * - ok(Flow) が返される
   * - フロー名がファイル名から抽出される
   * - ステップが正しくパースされる
   */
  it('YP-1: 基本的なフローを正しくパースできる', async () => {
    // Arrange
    const yamlContent = await loadFixture('valid/simple.flow.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'simple.flow.yaml');

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
   * 前提条件: valid/with-env.flow.yaml を読み込む
   * 検証項目:
   * - env が正しく抽出される
   * - 全ての値が文字列として扱われる
   */
  it('YP-2: envセクションが正しく抽出される', async () => {
    // Arrange
    const yamlContent = await loadFixture('valid/with-env.flow.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'with-env.flow.yaml');

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
   * 前提条件: valid/all-commands.flow.yaml を読み込む
   * 検証項目:
   * - 全てのMVPコマンド型が正しくパースされる
   * - ステップ数が期待値と一致する
   */
  it('YP-3: 全てのコマンド型を正しくパースできる', async () => {
    // Arrange
    const yamlContent = await loadFixture('valid/all-commands.flow.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'all-commands.flow.yaml');

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
- click: "ログインボタン"
- open: https://example.com
`;

    // Act
    const result = parseFlowYaml(yamlContent, 'test.flow.yaml');

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
   * 前提条件: invalid/syntax-error.flow.yaml を読み込む
   * 検証項目:
   * - err({ type: 'yaml_syntax_error', ... }) が返される
   * - message が含まれる
   *
   * 注意: yamlライブラリは多くの構文エラーを許容するため、
   * このテストは実際にdocument.errorsに格納されるエラーをチェックする
   */
  it('YP-5: YAML構文エラーでyaml_syntax_errorを返す', async () => {
    // Arrange
    const yamlContent = await loadFixture('invalid/syntax-error.flow.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'syntax-error.flow.yaml');

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
   * 前提条件: invalid/no-commands.flow.yaml を読み込む
   * 検証項目:
   * - err({ type: 'invalid_flow_structure', ... }) が返される
   */
  it('YP-6: コマンド配列がない場合、invalid_flow_structureを返す', async () => {
    // Arrange
    const yamlContent = await loadFixture('invalid/no-commands.flow.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'no-commands.flow.yaml');

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
   * 前提条件: invalid/invalid-command.flow.yaml を読み込む
   * 検証項目:
   * - err({ type: 'invalid_command', ... }) が返される
   * - commandIndex が含まれる
   */
  it('YP-7: 不正なコマンド形式でinvalid_commandを返す', async () => {
    // Arrange
    const yamlContent = await loadFixture('invalid/invalid-command.flow.yaml');

    // Act
    const result = parseFlowYaml(yamlContent, 'invalid-command.flow.yaml');

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
    const yamlContent = '[]';

    // Act
    const result = parseFlowYaml(yamlContent, 'empty.flow.yaml');

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
});
