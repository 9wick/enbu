/**
 * env-resolver.tsのユニットテスト
 *
 * resolveEnvVariables関数の全ての動作を検証する。
 */
import { describe, expect, it } from 'vitest';
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
          value: '${TEXT}',
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
          value: 'test@example.com',
        });
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });
});
