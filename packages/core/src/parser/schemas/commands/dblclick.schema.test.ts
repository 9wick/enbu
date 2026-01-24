/**
 * Dblclickコマンドスキーマのテスト
 *
 * DblclickYamlSchemaがYAML入力形式を正しくDblclickCommandに変換することを検証する。
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { DblclickYamlSchema } from './dblclick.schema';

describe('DblclickYamlSchema', () => {
  describe('簡略形式', () => {
    // 前提: dblclick: "テキスト" 形式の入力
    // 検証: { command: 'dblclick', interactableText: "テキスト" } に変換されること
    it('文字列を指定した場合、interactableText形式のDblclickCommandに変換される', () => {
      const input = { dblclick: '編集' };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'dblclick', interactableText: '編集' });
      }
    });

    // 前提: 空文字列を指定
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { dblclick: '' };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('詳細形式 - cssセレクタ', () => {
    // 前提: dblclick: { css: "..." } 形式の入力
    // 検証: { command: 'dblclick', css: "..." } に変換されること
    it('cssセレクタを指定した場合、css形式のDblclickCommandに変換される', () => {
      const input = { dblclick: { css: '#edit-button' } };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'dblclick', css: '#edit-button' });
      }
    });
  });

  describe('詳細形式 - textセレクタ（interactableTextに変換）', () => {
    // 前提: dblclick: { text: "..." } 形式の入力
    // 検証: { command: 'dblclick', interactableText: "..." } に変換されること
    // 注意: YAML入力では text を使用し、内部で interactableText に変換される
    it('textセレクタを指定した場合、interactableText形式のDblclickCommandに変換される', () => {
      const input = { dblclick: { text: '編集ボタン' } };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'dblclick', interactableText: '編集ボタン' });
      }
    });
  });

  describe('詳細形式 - xpathセレクタ', () => {
    // 前提: dblclick: { xpath: "..." } 形式の入力
    // 検証: { command: 'dblclick', xpath: "..." } に変換されること
    it('xpathセレクタを指定した場合、xpath形式のDblclickCommandに変換される', () => {
      const input = { dblclick: { xpath: "//button[@class='edit']" } };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'dblclick', xpath: "//button[@class='edit']" });
      }
    });
  });

  describe('不正な入力', () => {
    // 前提: dblclickキーがない
    // 検証: バリデーションエラーになること
    it('dblclickキーがない場合はエラー', () => {
      const input = { other: 'value' };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: dblclickの値がnumber
    // 検証: バリデーションエラーになること
    it('dblclickの値が数値の場合はエラー', () => {
      const input = { dblclick: 123 };

      const result = safeParse(DblclickYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: 複数のセレクタが指定されている
    // 検証: バリデーションエラーになること（unionなので最初にマッチしたものが使われる）
    it('複数のセレクタが指定された場合は最初にマッチしたものが使われる', () => {
      // unionの仕様上、cssが最初にマッチするのでcssが使われる
      const input = { dblclick: { css: '#btn', ref: '@e1' } };

      const result = safeParse(DblclickYamlSchema, input);

      // unionは最初にマッチしたスキーマを使用するため、追加プロパティは無視される
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'dblclick', css: '#btn' });
      }
    });
  });
});
