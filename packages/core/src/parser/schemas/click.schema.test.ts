/**
 * Clickコマンドスキーマのテスト
 *
 * ClickYamlSchemaがYAML入力形式を正しくRawClickCommandに変換することを検証する。
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { ClickYamlSchema } from './commands/click.schema';

describe('ClickYamlSchema', () => {
  describe('簡略形式', () => {
    // 前提: click: "テキスト" 形式の入力
    // 検証: { command: 'click', interactableText: "テキスト" } に変換されること
    it('文字列を指定した場合、interactableText形式のRawClickCommandに変換される', () => {
      const input = { click: 'ログイン' };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'click', interactableText: 'ログイン' });
      }
    });

    // 前提: 空文字列を指定
    // 検証: バリデーションエラーになること
    it('空文字列はバリデーションエラーになる', () => {
      const input = { click: '' };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(false);
    });
  });

  describe('詳細形式 - cssセレクタ', () => {
    // 前提: click: { css: "..." } 形式の入力
    // 検証: { command: 'click', css: "..." } に変換されること
    it('cssセレクタを指定した場合、css形式のRawClickCommandに変換される', () => {
      const input = { click: { css: '#login-button' } };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'click', css: '#login-button' });
      }
    });
  });

  describe('詳細形式 - interactableTextセレクタ', () => {
    // 前提: click: { interactableText: "..." } 形式の入力
    // 検証: { command: 'click', interactableText: "..." } に変換されること
    it('interactableTextセレクタを指定した場合、interactableText形式のRawClickCommandに変換される', () => {
      const input = { click: { interactableText: '送信する' } };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'click', interactableText: '送信する' });
      }
    });
  });

  describe('詳細形式 - xpathセレクタ', () => {
    // 前提: click: { xpath: "..." } 形式の入力
    // 検証: { command: 'click', xpath: "..." } に変換されること
    it('xpathセレクタを指定した場合、xpath形式のRawClickCommandに変換される', () => {
      const input = { click: { xpath: "//button[@type='submit']" } };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'click', xpath: "//button[@type='submit']" });
      }
    });
  });

  describe('不正な入力', () => {
    // 前提: clickキーがない
    // 検証: バリデーションエラーになること
    it('clickキーがない場合はエラー', () => {
      const input = { other: 'value' };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: clickの値がnumber
    // 検証: バリデーションエラーになること
    it('clickの値が数値の場合はエラー', () => {
      const input = { click: 123 };

      const result = safeParse(ClickYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: 複数のセレクタが指定されている
    // 検証: バリデーションエラーになること（SelectorSpecSchemaはunionなので最初にマッチしたものが使われる）
    it('複数のセレクタが指定された場合は最初にマッチしたものが使われる', () => {
      // unionの仕様上、cssが最初にマッチするのでcssが使われる
      const input = { click: { css: '#btn', ref: '@e1' } };

      const result = safeParse(ClickYamlSchema, input);

      // unionは最初にマッチしたスキーマを使用するため、追加プロパティは無視される
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({ command: 'click', css: '#btn' });
      }
    });
  });
});
