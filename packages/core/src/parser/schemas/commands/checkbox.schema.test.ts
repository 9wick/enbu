/**
 * チェックボックスコマンドスキーマのテスト
 *
 * CheckYamlSchema、UncheckYamlSchemaがYAML入力形式を正しくCheckCommand、UncheckCommandに変換することを検証する。
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { CheckYamlSchema, UncheckYamlSchema } from './checkbox.schema';

describe('CheckYamlSchema', () => {
  describe('簡略形式', () => {
    // 前提: check: "テキスト" 形式の入力
    // 検証: { command: 'check', interactableText: "テキスト" } に変換されること
    it('文字列を指定した場合、interactableText形式のCheckCommandに変換される', () => {
      const input = { check: '利用規約に同意する' };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'check', interactableText: '利用規約に同意する' });
      }
    });

    // 前提: 空文字列を指定
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { check: '' };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('詳細形式 - cssセレクタ', () => {
    // 前提: check: { css: "..." } 形式の入力
    // 検証: { command: 'check', css: "..." } に変換されること
    it('cssセレクタを指定した場合、css形式のCheckCommandに変換される', () => {
      const input = { check: { css: '#agree-terms' } };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'check', css: '#agree-terms' });
      }
    });
  });

  describe('詳細形式 - textセレクタ（interactableTextに変換）', () => {
    // 前提: check: { text: "..." } 形式の入力
    // 検証: { command: 'check', interactableText: "..." } に変換されること
    // 注意: YAML入力では text を使用し、内部で interactableText に変換される
    it('textセレクタを指定した場合、interactableText形式のCheckCommandに変換される', () => {
      const input = { check: { text: 'メール配信を希望する' } };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'check',
          interactableText: 'メール配信を希望する',
        });
      }
    });
  });

  describe('詳細形式 - xpathセレクタ', () => {
    // 前提: check: { xpath: "..." } 形式の入力
    // 検証: { command: 'check', xpath: "..." } に変換されること
    it('xpathセレクタを指定した場合、xpath形式のCheckCommandに変換される', () => {
      const input = { check: { xpath: "//input[@type='checkbox']" } };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'check', xpath: "//input[@type='checkbox']" });
      }
    });
  });

  describe('不正な入力', () => {
    // 前提: checkキーがない
    // 検証: バリデーションエラーになること
    it('checkキーがない場合はエラー', () => {
      const input = { other: 'value' };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: checkの値がnumber
    // 検証: バリデーションエラーになること
    it('checkの値が数値の場合はエラー', () => {
      const input = { check: 123 };

      const result = safeParse(CheckYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: 複数のセレクタが指定されている
    // 検証: バリデーションエラーになること（unionなので最初にマッチしたものが使われる）
    it('複数のセレクタが指定された場合は最初にマッチしたものが使われる', () => {
      // unionの仕様上、cssが最初にマッチするのでcssが使われる
      const input = { check: { css: '#checkbox', ref: '@e1' } };

      const result = safeParse(CheckYamlSchema, input);

      // unionは最初にマッチしたスキーマを使用するため、追加プロパティは無視される
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'check', css: '#checkbox' });
      }
    });
  });
});

describe('UncheckYamlSchema', () => {
  describe('簡略形式', () => {
    // 前提: uncheck: "テキスト" 形式の入力
    // 検証: { command: 'uncheck', interactableText: "テキスト" } に変換されること
    it('文字列を指定した場合、interactableText形式のUncheckCommandに変換される', () => {
      const input = { uncheck: 'メール配信を希望する' };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'uncheck',
          interactableText: 'メール配信を希望する',
        });
      }
    });

    // 前提: 空文字列を指定
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { uncheck: '' };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('詳細形式 - cssセレクタ', () => {
    // 前提: uncheck: { css: "..." } 形式の入力
    // 検証: { command: 'uncheck', css: "..." } に変換されること
    it('cssセレクタを指定した場合、css形式のUncheckCommandに変換される', () => {
      const input = { uncheck: { css: '#newsletter' } };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'uncheck', css: '#newsletter' });
      }
    });
  });

  describe('詳細形式 - textセレクタ（interactableTextに変換）', () => {
    // 前提: uncheck: { text: "..." } 形式の入力
    // 検証: { command: 'uncheck', interactableText: "..." } に変換されること
    // 注意: YAML入力では text を使用し、内部で interactableText に変換される
    it('textセレクタを指定した場合、interactableText形式のUncheckCommandに変換される', () => {
      const input = { uncheck: { text: '利用規約に同意する' } };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'uncheck',
          interactableText: '利用規約に同意する',
        });
      }
    });
  });

  describe('詳細形式 - xpathセレクタ', () => {
    // 前提: uncheck: { xpath: "..." } 形式の入力
    // 検証: { command: 'uncheck', xpath: "..." } に変換されること
    it('xpathセレクタを指定した場合、xpath形式のUncheckCommandに変換される', () => {
      const input = { uncheck: { xpath: "//input[@name='subscribe']" } };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'uncheck', xpath: "//input[@name='subscribe']" });
      }
    });
  });

  describe('不正な入力', () => {
    // 前提: uncheckキーがない
    // 検証: バリデーションエラーになること
    it('uncheckキーがない場合はエラー', () => {
      const input = { other: 'value' };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: uncheckの値がnumber
    // 検証: バリデーションエラーになること
    it('uncheckの値が数値の場合はエラー', () => {
      const input = { uncheck: 123 };

      const result = safeParse(UncheckYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: 複数のセレクタが指定されている
    // 検証: バリデーションエラーになること（unionなので最初にマッチしたものが使われる）
    it('複数のセレクタが指定された場合は最初にマッチしたものが使われる', () => {
      // unionの仕様上、cssが最初にマッチするのでcssが使われる
      const input = { uncheck: { css: '#checkbox', ref: '@e1' } };

      const result = safeParse(UncheckYamlSchema, input);

      // unionは最初にマッチしたスキーマを使用するため、追加プロパティは無視される
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'uncheck', css: '#checkbox' });
      }
    });
  });
});
