/**
 * flow-loader.tsのユニットテスト
 *
 * loadFlows関数の各種テストケースを実装。
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadFlows } from './flow-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
   * 注意: YAML入力形式は text を使用し、内部で interactableText に変換される
   */
  it('FL-1: 単一ファイルを正しく読み込める', async () => {
    // Arrange: 1つの有効なフローファイルを作成（text キーを使用）
    const yamlContent = `
steps:
  - open: https://example.com
  - click:
      text: "ボタン"
`;
    await writeFile(join(TEST_DIR, 'test.enbu.yaml'), yamlContent);

    // Act: loadFlowsを実行
    const result = await loadFlows(TEST_DIR);

    // Assert: 正しくパースされたフローが返される（text は interactableText に変換される）
    result.match(
      (flows) => {
        expect(flows.length).toBe(1);
        expect(flows[0].name).toBe('test');
        expect(flows[0].steps.length).toBe(2);
        expect(flows[0].steps[0]).toEqual({
          command: 'open',
          url: 'https://example.com',
        });
        expect(flows[0].steps[1]).toEqual({
          command: 'click',
          interactableText: 'ボタン',
        });
      },
      () => {
        throw new Error('Expected ok result');
      },
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
    // Arrange: 3つの有効なフローファイルを作成
    await writeFile(join(TEST_DIR, 'flow1.enbu.yaml'), 'steps:\n  - open: https://example1.com');
    await writeFile(join(TEST_DIR, 'flow2.enbu.yaml'), 'steps:\n  - open: https://example2.com');
    await writeFile(join(TEST_DIR, 'flow3.enbu.yaml'), 'steps:\n  - open: https://example3.com');

    // Act: loadFlowsを実行
    const result = await loadFlows(TEST_DIR);

    // Assert: 3つのフローが読み込まれる
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
      },
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
    // Arrange: アルファベット順でない順序でファイルを作成
    await writeFile(join(TEST_DIR, 'c.enbu.yaml'), 'steps:\n  - open: https://c.example.com');
    await writeFile(join(TEST_DIR, 'a.enbu.yaml'), 'steps:\n  - open: https://a.example.com');
    await writeFile(join(TEST_DIR, 'b.enbu.yaml'), 'steps:\n  - open: https://b.example.com');

    // Act: loadFlowsを実行
    const result = await loadFlows(TEST_DIR);

    // Assert: アルファベット順にソートされている
    result.match(
      (flows) => {
        const names = flows.map((f) => f.name);
        expect(names).toEqual(['a', 'b', 'c']);
      },
      () => {
        throw new Error('Expected ok result');
      },
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
    // Arrange: 環境変数を使用するフローファイルと.envファイルを作成
    const yamlContent = 'steps:\n  - open: ${BASE_URL}';
    const envContent = 'BASE_URL=https://from-dotenv.com';

    await writeFile(join(TEST_DIR, 'test.enbu.yaml'), yamlContent);
    await writeFile(join(TEST_DIR, '.env'), envContent);

    // Act: dotEnvPathを指定してloadFlowsを実行
    const result = await loadFlows(TEST_DIR, {
      processEnv: {},
      dotEnvPath: join(TEST_DIR, '.env'),
    });

    // Assert: .envの値が環境変数として解決される
    result.match(
      (flows) => {
        expect(flows[0].steps[0]).toEqual({
          command: 'open',
          url: 'https://from-dotenv.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      },
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
    // Arrange: 存在しないディレクトリパスを準備
    const nonExistentDir = join(TEST_DIR, 'non-existent');

    // Act: 存在しないディレクトリに対してloadFlowsを実行
    const result = await loadFlows(nonExistentDir);

    // Assert: file_read_errorが返される
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('file_read_error');
        if (error.type === 'file_read_error') {
          expect(error.filePath).toBe(nonExistentDir);
        }
      },
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
    // Arrange: ディレクトリは存在するがフローファイルなし

    // Act: 空のディレクトリに対してloadFlowsを実行
    const result = await loadFlows(TEST_DIR);

    // Assert: 空配列が返される
    result.match(
      (flows) => {
        expect(flows.length).toBe(0);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * FL-7: パースエラーのあるファイル
   *
   * 前提条件: 複数ファイルのうち1つにパースエラー
   * 検証項目:
   * - エラーが返される
   */
  it('FL-7: パースエラーのあるファイルでエラーを返す', async () => {
    // Arrange: 有効なファイルと無効なファイルを作成
    await writeFile(join(TEST_DIR, 'valid.enbu.yaml'), 'steps:\n  - open: https://example.com');
    await writeFile(join(TEST_DIR, 'invalid.enbu.yaml'), 'steps:\n  - invalidCommand: "テスト"');

    // Act: loadFlowsを実行
    const result = await loadFlows(TEST_DIR);

    // Assert: パースエラーが返される
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        // パースエラーまたはコマンド不正のエラーが返される
        expect(['yaml_syntax_error', 'invalid_flow_structure', 'invalid_command']).toContain(
          error.type,
        );
      },
    );
  });
});
