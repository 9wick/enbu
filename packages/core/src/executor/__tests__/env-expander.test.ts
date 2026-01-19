import { describe, it, expect } from 'vitest';
import { expandEnvVars } from '../env-expander';
import type { Flow } from '../../types';

describe('expandEnvVars', () => {
  /**
   * ENV-1: 単一の環境変数を展開
   *
   * 前提条件: フローに ${BASE_URL} を含む
   * 検証項目: 環境変数が正しく展開される
   */
  it('ENV-1: 環境変数が正しく展開される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${BASE_URL}/login' }],
    };

    const env = { BASE_URL: 'https://example.com' };

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    // 環境変数展開が成功する
    expect(result.isOk()).toBe(true);
    result.match(
      (expandedFlow) => {
        // open コマンドのurl フィールドが展開されている
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((expandedFlow.steps[0] as any).url).toBe('https://example.com/login');
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * ENV-2: 複数の環境変数を展開
   *
   * 前提条件: フローに ${BASE_URL} と ${PATH} を含む
   * 検証項目: 各環境変数が正しく展開される
   */
  it('ENV-2: 複数の環境変数が正しく展開される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${BASE_URL}/${PATH}' }],
    };

    const env = { BASE_URL: 'https://example.com', PATH: 'login' };

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    // 環境変数展開が成功する
    expect(result.isOk()).toBe(true);
    result.match(
      (expandedFlow) => {
        // open コマンドのurl フィールドが展開されている
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((expandedFlow.steps[0] as any).url).toBe('https://example.com/login');
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * ENV-3: 存在しない変数はエラー
   *
   * 前提条件: ${UNDEFINED} を含むフロー
   * 検証項目: 存在しない環境変数はcommand_execution_failedになる
   */
  it('ENV-3: 存在しない環境変数はエラーになる', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: '${UNDEFINED}/path' }],
    };

    const env = {};

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    // 存在しない環境変数はエラーになる
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('command_execution_failed');
        if (error.type === 'command_execution_failed') {
          expect(error.message).toContain('環境変数');
          expect(error.message).toContain('${UNDEFINED}');
        }
      },
    );
  });

  /**
   * ENV-4: 環境変数を含まない文字列はそのまま
   *
   * 前提条件: 環境変数プレースホルダーを含まないフロー
   * 検証項目: 文字列がそのまま保持される
   */
  it('ENV-4: 環境変数を含まない文字列はそのまま', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [{ command: 'open', url: 'https://example.com/static' }],
    };

    const env = { BASE_URL: 'https://other.com' };

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    // 環境変数展開が成功する
    expect(result.isOk()).toBe(true);
    result.match(
      (expandedFlow) => {
        // 環境変数を含まない文字列はそのまま
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((expandedFlow.steps[0] as any).url).toBe('https://example.com/static');
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * ENV-5: 複数ステップで展開
   *
   * 前提条件: 複数のステップに環境変数を含む
   * 検証項目: 各ステップで正しく展開される
   */
  it('ENV-5: 複数ステップで環境変数が正しく展開される', () => {
    // Arrange
    const flow: Flow = {
      name: 'テストフロー',
      env: {},
      steps: [
        { command: 'open', url: '${BASE_URL}/login' },
        { command: 'fill', selector: 'メールアドレス', value: '${EMAIL}' },
        { command: 'fill', selector: 'パスワード', value: '${PASSWORD}' },
      ],
    };

    const env = {
      BASE_URL: 'https://example.com',
      EMAIL: 'test@example.com',
      PASSWORD: 'secret123',
    };

    // Act
    const result = expandEnvVars(flow, env);

    // Assert
    // 環境変数展開が成功する
    expect(result.isOk()).toBe(true);
    result.match(
      (expandedFlow) => {
        // 各ステップで環境変数が展開されている
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((expandedFlow.steps[0] as any).url).toBe('https://example.com/login');
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((expandedFlow.steps[1] as any).value).toBe('test@example.com');
        // biome-ignore lint/suspicious/noExplicitAny: テスト用の動的プロパティアクセス
        expect((expandedFlow.steps[2] as any).value).toBe('secret123');
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });
});
