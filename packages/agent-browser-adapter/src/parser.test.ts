import { describe, it, expect } from 'vitest';
import { parseJsonOutput, parseSnapshotRefs } from './parser';

/**
 * 型ガード: オブジェクトかどうかを判定
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

describe('parseJsonOutput', () => {
  /**
   * P-1: 有効なJSON出力のパース
   *
   * 前提条件: 正しいJSON文字列
   * 検証項目: パース済みオブジェクトが返される
   */
  it('P-1: 有効なJSONをパースできる', () => {
    // Arrange
    const input = '{"success":true,"data":{"url":"https://example.com"},"error":null}';

    // Act
    const result = parseJsonOutput(input);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (output) => {
        expect(output.success).toBe(true);
        // dataはunknown型なので、型ガードまたは型アサーションで絞り込む
        if (isRecord(output.data)) {
          expect(output.data.url).toBe('https://example.com');
        }
        expect(output.error).toBeNull();
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * P-2: 無効なJSON
   *
   * 前提条件: 構文エラーのある文字列
   * 検証項目: parse_errorエラーが返される
   */
  it('P-2: 無効なJSONでparse_errorを返す', () => {
    // Arrange
    const input = 'not valid json {{{';

    // Act
    const result = parseJsonOutput(input);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.rawOutput).toBe(input);
        }
      },
    );
  });

  /**
   * P-3: 構造が不正なJSON
   *
   * 前提条件: success/data/error フィールドがない
   * 検証項目: parse_errorエラーが返される
   */
  it('P-3: 必須フィールドがない場合、parse_errorを返す', () => {
    // Arrange
    const input = '{"result":"ok"}'; // success, data, error がない

    // Act
    const result = parseJsonOutput(input);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.message).toContain('Invalid JSON structure');
        }
      },
    );
  });
});

describe('parseSnapshotRefs', () => {
  /**
   * P-4: snapshot refs のパース成功
   *
   * 前提条件: success=true, data.refs が存在
   * 検証項目: SnapshotRefs が返される
   */
  it('P-4: 有効なsnapshot出力からrefsを抽出できる', () => {
    // Arrange
    const jsonOutput = {
      success: true,
      data: {
        refs: {
          e1: { name: 'ログインボタン', role: 'button' },
          e2: { name: 'メールアドレス', role: 'textbox' },
        },
        snapshot: '...',
      },
      error: null,
    };

    // Act
    const result = parseSnapshotRefs(jsonOutput);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (refs) => {
        expect(refs['e1']).toEqual({ name: 'ログインボタン', role: 'button' });
        expect(refs['e2']).toEqual({ name: 'メールアドレス', role: 'textbox' });
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * P-5: snapshot 失敗レスポンス
   *
   * 前提条件: success=false
   * 検証項目: parse_errorエラーが返される
   */
  it('P-5: success=falseの場合、parse_errorを返す', () => {
    // Arrange
    const jsonOutput = {
      success: false,
      data: null,
      error: 'No page open',
    };

    // Act
    const result = parseSnapshotRefs(jsonOutput);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.message).toContain('Snapshot failed');
        }
      },
    );
  });

  /**
   * P-6: refs が存在しない
   *
   * 前提条件: success=true だが data.refs がない
   * 検証項目: parse_errorエラーが返される
   */
  it('P-6: refsがない場合、parse_errorを返す', () => {
    // Arrange
    const jsonOutput = {
      success: true,
      data: {
        snapshot: '...',
        // refs がない
      },
      error: null,
    };

    // Act
    const result = parseSnapshotRefs(jsonOutput);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('parse_error');
        if (error.type === 'parse_error') {
          expect(error.message).toContain('missing refs');
        }
      },
    );
  });
});
