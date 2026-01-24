/**
 * Dragコマンドスキーマのテスト
 */

import * as v from 'valibot';
import { describe, it, expect } from 'vitest';
import { DragYamlSchema, type DragCommand } from './drag.schema';

describe('DragYamlSchema', () => {
  describe('詳細形式（css）', () => {
    it('css セレクタで drag コマンドをパース', () => {
      const input = {
        drag: {
          source: { css: '#draggable' },
          target: { css: '#droppable' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        const command: DragCommand = result.output;
        expect(command.command).toBe('drag');
        expect('css' in command.source).toBe(true);
        if ('css' in command.source) {
          expect(command.source.css).toBe('#draggable');
        }
        expect('css' in command.target).toBe(true);
        if ('css' in command.target) {
          expect(command.target.css).toBe('#droppable');
        }
      }
    });
  });

  describe('詳細形式（text）', () => {
    it('text セレクタで drag コマンドをパース（interactableText に変換）', () => {
      const input = {
        drag: {
          source: { text: 'ドラッグ要素' },
          target: { text: 'ドロップ先' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        const command: DragCommand = result.output;
        expect(command.command).toBe('drag');
        expect('interactableText' in command.source).toBe(true);
        if ('interactableText' in command.source) {
          expect(command.source.interactableText).toBe('ドラッグ要素');
        }
        expect('interactableText' in command.target).toBe(true);
        if ('interactableText' in command.target) {
          expect(command.target.interactableText).toBe('ドロップ先');
        }
      }
    });
  });

  describe('詳細形式（xpath）', () => {
    it('xpath セレクタで drag コマンドをパース', () => {
      const input = {
        drag: {
          source: { xpath: '//div[@id="source"]' },
          target: { xpath: '//div[@id="target"]' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        const command: DragCommand = result.output;
        expect(command.command).toBe('drag');
        expect('xpath' in command.source).toBe(true);
        if ('xpath' in command.source) {
          expect(command.source.xpath).toBe('//div[@id="source"]');
        }
        expect('xpath' in command.target).toBe(true);
        if ('xpath' in command.target) {
          expect(command.target.xpath).toBe('//div[@id="target"]');
        }
      }
    });
  });

  describe('バリデーションエラー', () => {
    it('source が空の場合はエラー', () => {
      const input = {
        drag: {
          source: { css: '' },
          target: { css: '#droppable' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(false);
    });

    it('target が空の場合はエラー', () => {
      const input = {
        drag: {
          source: { css: '#draggable' },
          target: { css: '' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(false);
    });

    it('source がない場合はエラー', () => {
      const input = {
        drag: {
          target: { css: '#droppable' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(false);
    });

    it('target がない場合はエラー', () => {
      const input = {
        drag: {
          source: { css: '#draggable' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(false);
    });
  });

  describe('混合セレクタ', () => {
    it('source は css、target は text でも正常にパース', () => {
      const input = {
        drag: {
          source: { css: '#draggable' },
          target: { text: 'ドロップ先' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        const command: DragCommand = result.output;
        expect(command.command).toBe('drag');
        expect('css' in command.source).toBe(true);
        expect('interactableText' in command.target).toBe(true);
      }
    });

    it('source は xpath、target は css でも正常にパース', () => {
      const input = {
        drag: {
          source: { xpath: '//div[@id="source"]' },
          target: { css: '#droppable' },
        },
      };
      const result = v.safeParse(DragYamlSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        const command: DragCommand = result.output;
        expect(command.command).toBe('drag');
        expect('xpath' in command.source).toBe(true);
        expect('css' in command.target).toBe(true);
      }
    });
  });
});
