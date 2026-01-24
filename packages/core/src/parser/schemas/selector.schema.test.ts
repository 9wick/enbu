/**
 * セレクタスキーマのテスト
 *
 * InteractableSelectorSpecSchemaとAnySelectorSpecSchemaが
 * YAML入力形式を正しく出力形式に変換することを検証する。
 *
 * 重要な変換:
 * - text 入力 → InteractableSelectorSpecSchema では interactableText 出力
 * - text 入力 → AnySelectorSpecSchema では anyText 出力
 * - css/xpath は変換なし
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { AnySelectorSpecSchema, InteractableSelectorSpecSchema } from './selector.schema';

describe('InteractableSelectorSpecSchema', () => {
  describe('text入力 → interactableText出力', () => {
    // 前提: { text: "..." } 形式の入力
    // 検証: { interactableText: "..." } に変換されること
    it('text入力がinteractableText出力に変換される', () => {
      const input = { text: 'ログイン' };

      const result = safeParse(InteractableSelectorSpecSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ interactableText: 'ログイン' });
        // text キーは出力に含まれないこと
        expect('text' in result.output).toBe(false);
      }
    });

    // 前提: 空文字列
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { text: '' };

      const result = safeParse(InteractableSelectorSpecSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('cssセレクタ（変換なし）', () => {
    // 前提: { css: "..." } 形式の入力
    // 検証: そのまま { css: "..." } が出力されること
    it('cssセレクタはそのまま出力される', () => {
      const input = { css: '#login-button' };

      const result = safeParse(InteractableSelectorSpecSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ css: '#login-button' });
      }
    });
  });

  describe('xpathセレクタ（変換なし）', () => {
    // 前提: { xpath: "..." } 形式の入力
    // 検証: そのまま { xpath: "..." } が出力されること
    it('xpathセレクタはそのまま出力される', () => {
      const input = { xpath: "//button[@type='submit']" };

      const result = safeParse(InteractableSelectorSpecSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ xpath: "//button[@type='submit']" });
      }
    });
  });

  describe('破壊的変更 - 旧キーはエラー', () => {
    // 前提: 旧形式の interactableText キーを使用
    // 検証: バリデーションエラーになること（破壊的変更）
    it('interactableText入力はエラー（破壊的変更）', () => {
      const input = { interactableText: 'ログイン' };

      const result = safeParse(InteractableSelectorSpecSchema, input);

      expect(result.success).toBe(false);
    });
  });
});

describe('AnySelectorSpecSchema', () => {
  describe('text入力 → anyText出力', () => {
    // 前提: { text: "..." } 形式の入力
    // 検証: { anyText: "..." } に変換されること
    it('text入力がanyText出力に変換される', () => {
      const input = { text: 'ようこそ' };

      const result = safeParse(AnySelectorSpecSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ anyText: 'ようこそ' });
        // text キーは出力に含まれないこと
        expect('text' in result.output).toBe(false);
      }
    });

    // 前提: 空文字列
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { text: '' };

      const result = safeParse(AnySelectorSpecSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('cssセレクタ（変換なし）', () => {
    // 前提: { css: "..." } 形式の入力
    // 検証: そのまま { css: "..." } が出力されること
    it('cssセレクタはそのまま出力される', () => {
      const input = { css: '.message' };

      const result = safeParse(AnySelectorSpecSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ css: '.message' });
      }
    });
  });

  describe('xpathセレクタ（変換なし）', () => {
    // 前提: { xpath: "..." } 形式の入力
    // 検証: そのまま { xpath: "..." } が出力されること
    it('xpathセレクタはそのまま出力される', () => {
      const input = { xpath: '//div[@class="content"]' };

      const result = safeParse(AnySelectorSpecSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ xpath: '//div[@class="content"]' });
      }
    });
  });

  describe('破壊的変更 - 旧キーはエラー', () => {
    // 前提: 旧形式の anyText キーを使用
    // 検証: バリデーションエラーになること（破壊的変更）
    it('anyText入力はエラー（破壊的変更）', () => {
      const input = { anyText: 'ようこそ' };

      const result = safeParse(AnySelectorSpecSchema, input);

      expect(result.success).toBe(false);
    });
  });
});
