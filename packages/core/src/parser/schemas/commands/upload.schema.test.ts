/**
 * Uploadコマンドスキーマのテスト
 *
 * UploadYamlSchemaがYAML入力形式を正しくUploadCommandに変換することを検証する。
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from 'valibot';
import { UploadYamlSchema } from './upload.schema';

describe('UploadYamlSchema', () => {
  describe('詳細形式 - cssセレクタ + 単一ファイル', () => {
    // 前提: upload: { css: "...", files: "..." } 形式の入力
    // 検証: { command: 'upload', css: CssSelector, files: FilePath } に変換されること
    it('cssセレクタと単一ファイルパスを指定した場合、正しく変換される', () => {
      const input = { upload: { css: 'input[type="file"]', files: '/path/to/file.pdf' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'upload',
          css: 'input[type="file"]',
          files: '/path/to/file.pdf',
        });
      }
    });
  });

  describe('詳細形式 - cssセレクタ + 複数ファイル', () => {
    // 前提: upload: { css: "...", files: ["...", "..."] } 形式の入力
    // 検証: { command: 'upload', css: CssSelector, files: FilePath[] } に変換されること
    it('cssセレクタと複数ファイルパスを指定した場合、正しく変換される', () => {
      const input = {
        upload: {
          css: '#file-upload',
          files: ['/path/to/file1.pdf', '/path/to/file2.jpg'],
        },
      };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'upload',
          css: '#file-upload',
          files: ['/path/to/file1.pdf', '/path/to/file2.jpg'],
        });
      }
    });
  });

  describe('詳細形式 - textセレクタ（interactableTextに変換）', () => {
    // 前提: upload: { text: "...", files: "..." } 形式の入力
    // 検証: { command: 'upload', interactableText: "...", files: FilePath } に変換されること
    // 注意: YAML入力では text を使用し、内部で interactableText に変換される
    it('textセレクタと単一ファイルパスを指定した場合、interactableTextに変換される', () => {
      const input = { upload: { text: 'ファイル選択', files: '/path/to/document.pdf' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'upload',
          interactableText: 'ファイル選択',
          files: '/path/to/document.pdf',
        });
      }
    });

    it('textセレクタと複数ファイルパスを指定した場合、正しく変換される', () => {
      const input = {
        upload: {
          text: 'Upload file',
          files: ['/path/to/image1.png', '/path/to/image2.jpg'],
        },
      };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'upload',
          interactableText: 'Upload file',
          files: ['/path/to/image1.png', '/path/to/image2.jpg'],
        });
      }
    });
  });

  describe('詳細形式 - xpathセレクタ', () => {
    // 前提: upload: { xpath: "...", files: "..." } 形式の入力
    // 検証: { command: 'upload', xpath: XpathSelector, files: FilePath } に変換されること
    it('xpathセレクタと単一ファイルパスを指定した場合、正しく変換される', () => {
      const input = { upload: { xpath: "//input[@type='file']", files: '/path/to/file.zip' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'upload',
          xpath: "//input[@type='file']",
          files: '/path/to/file.zip',
        });
      }
    });

    it('xpathセレクタと複数ファイルパスを指定した場合、正しく変換される', () => {
      const input = {
        upload: {
          xpath: '//input[@name="files"]',
          files: ['/path/to/doc1.pdf', '/path/to/doc2.docx'],
        },
      };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toEqual({
          command: 'upload',
          xpath: '//input[@name="files"]',
          files: ['/path/to/doc1.pdf', '/path/to/doc2.docx'],
        });
      }
    });
  });

  describe('不正な入力', () => {
    // 前提: uploadキーがない
    // 検証: バリデーションエラーになること
    it('uploadキーがない場合はエラー', () => {
      const input = { other: 'value' };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: filesが空文字列
    // 検証: バリデーションエラーになること（FilePathのmin(1)制約）
    it('filesが空文字列の場合はエラー', () => {
      const input = { upload: { css: 'input', files: '' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: filesが空配列
    // 検証: バリデーションエラーになること
    it('filesが空配列の場合はエラー', () => {
      const input = { upload: { css: 'input', files: [] } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: cssセレクタが不正な形式
    // 検証: バリデーションエラーになること
    it('cssセレクタが不正な形式の場合はエラー', () => {
      const input = { upload: { css: '123invalid', files: '/path/to/file.pdf' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: xpathセレクタが不正な形式
    // 検証: バリデーションエラーになること
    it('xpathセレクタが不正な形式の場合はエラー', () => {
      const input = { upload: { xpath: 'invalid', files: '/path/to/file.pdf' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(false);
    });

    // 前提: textセレクタが空文字列
    // 検証: バリデーションエラーになること
    it('textセレクタが空文字列の場合はエラー', () => {
      const input = { upload: { text: '', files: '/path/to/file.pdf' } };

      const result = safeParse(UploadYamlSchema, input);

      expect(result.success).toBe(false);
    });
  });
});
