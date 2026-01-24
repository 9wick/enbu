/**
 * Focusコマンドスキーマのテスト
 *
 * FocusYamlSchemaがYAML入力形式を正しくRawFocusCommandに変換することを検証する。
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { FocusYamlSchema } from './focus.schema';

describe('FocusYamlSchema', () => {
  describe('簡略形式', () => {
    // 前提: focus: "テキスト" 形式の入力
    // 検証: { command: 'focus', interactableText: "テキスト" } に変換されること
    it('文字列を指定した場合、interactableText形式のRawFocusCommandに変換される', () => {
      const input = { focus: '入力欄ラベル' };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'focus', interactableText: '入力欄ラベル' });
      }
    });

    // 前提: 空文字列を指定
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { focus: '' };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('詳細形式 - cssセレクタ', () => {
    // 前提: focus: { css: "..." } 形式の入力
    // 検証: { command: 'focus', css: "..." } に変換されること
    it('cssセレクタを指定した場合、css形式のRawFocusCommandに変換される', () => {
      const input = { focus: { css: '#email-input' } };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'focus', css: '#email-input' });
      }
    });
  });

  describe('詳細形式 - textセレクタ（interactableTextに変換）', () => {
    // 前提: focus: { text: "..." } 形式の入力
    // 検証: { command: 'focus', interactableText: "..." } に変換されること
    // 注意: YAML入力では text を使用し、内部で interactableText に変換される
    it('textセレクタを指定した場合、interactableText形式のRawFocusCommandに変換される', () => {
      const input = { focus: { text: 'メールアドレス' } };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'focus', interactableText: 'メールアドレス' });
      }
    });
  });

  describe('詳細形式 - xpathセレクタ', () => {
    // 前提: focus: { xpath: "..." } 形式の入力
    // 検証: { command: 'focus', xpath: "..." } に変換されること
    it('xpathセレクタを指定した場合、xpath形式のRawFocusCommandに変換される', () => {
      const input = { focus: { xpath: "//input[@type='email']" } };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'focus', xpath: "//input[@type='email']" });
      }
    });
  });

  describe('不正な入力', () => {
    // 前提: focusキーがない
    // 検証: バリデーションエラーになること
    it('focusキーがない場合はエラー', () => {
      const input = { other: 'value' };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: focusの値がnumber
    // 検証: バリデーションエラーになること
    it('focusの値が数値の場合はエラー', () => {
      const input = { focus: 123 };

      const result = safeParse(FocusYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: 複数のセレクタが指定されている
    // 検証: バリデーションエラーになること（unionなので最初にマッチしたものが使われる）
    it('複数のセレクタが指定された場合は最初にマッチしたものが使われる', () => {
      // unionの仕様上、cssが最初にマッチするのでcssが使われる
      const input = { focus: { css: '#input', ref: '@e1' } };

      const result = safeParse(FocusYamlSchema, input);

      // unionは最初にマッチしたスキーマを使用するため、追加プロパティは無視される
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'focus', css: '#input' });
      }
    });
  });
});
