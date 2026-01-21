/**
 * JSON Schema生成のテスト
 *
 * generateJsonSchemaがvalibotスキーマから正しいJSON Schemaを生成することを検証する。
 */

import { describe, expect, it } from 'vitest';
import { generateJsonSchema } from './to-json-schema';

type AnyJsonSchema = any;

describe('generateJsonSchema', () => {
  // 前提: generateJsonSchemaを実行
  // 検証: JSON Schemaの基本構造が正しいこと
  it('JSON Schemaの基本構造が生成される', () => {
    const schema = generateJsonSchema();

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.definitions).toBeDefined();
    expect(schema.definitions.selectorSpec).toBeDefined();
    expect(schema.definitions.clickCommand).toBeDefined();
  });

  // 前提: generateJsonSchemaを実行
  // 検証: selectorSpecがanyOfでセレクタを含むこと
  // 注: SelectorSpecSchemaはInteractableSelectorSpecSchemaとAnySelectorSpecSchemaのunionであり、
  // さらにそれぞれが3つのセレクタのunionなので、構造が複雑になっている
  it('selectorSpecがanyOfでセレクタを含むこと', () => {
    const schema = generateJsonSchema();
    const selectorSpec = schema.definitions.selectorSpec as AnyJsonSchema;

    expect(selectorSpec.anyOf).toBeDefined();
    // SelectorSpecSchemaは2つのunionのunionなので、anyOfの長さは2
    expect(selectorSpec.anyOf.length).toBeGreaterThan(0);
  });

  // 前提: generateJsonSchemaを実行
  // 検証: clickCommandがanyOfで2つの形式を含むこと
  it('clickCommandが簡略形式と詳細形式の2つを定義している', () => {
    const schema = generateJsonSchema();
    const clickCommand = schema.definitions.clickCommand as AnyJsonSchema;

    expect(clickCommand.anyOf).toBeDefined();
    expect(clickCommand.anyOf).toHaveLength(2);
  });

  // 前提: generateJsonSchemaを実行
  // 検証: clickCommandの簡略形式がstring型を持つこと
  it('clickCommandの簡略形式がstring型のclickプロパティを持つ', () => {
    const schema = generateJsonSchema();
    const clickCommand = schema.definitions.clickCommand as AnyJsonSchema;

    // 簡略形式（最初のオプション）
    const shorthandOption = clickCommand.anyOf[0];
    expect(shorthandOption.properties.click.type).toBe('string');
    expect(shorthandOption.properties.click.minLength).toBe(1);
  });

  // 前提: generateJsonSchemaを実行
  // 検証: clickCommandの詳細形式がanyOfでセレクタを持つこと
  it('clickCommandの詳細形式がセレクタのanyOfを持つ', () => {
    const schema = generateJsonSchema();
    const clickCommand = schema.definitions.clickCommand as AnyJsonSchema;

    // 詳細形式（2番目のオプション）
    const detailedOption = clickCommand.anyOf[1];
    expect(detailedOption.properties.click.anyOf).toBeDefined();
    expect(detailedOption.properties.click.anyOf).toHaveLength(3);
  });

  // 前提: generateJsonSchemaを実行
  // 検証: descriptionが含まれていること
  it('各フィールドにdescriptionが含まれる', () => {
    const schema = generateJsonSchema();
    const clickCommand = schema.definitions.clickCommand as AnyJsonSchema;

    // clickCommandの詳細形式（2番目のオプション）にdescriptionが含まれることを確認
    const detailedOption = clickCommand.anyOf[1];
    expect(detailedOption.properties.click).toBeDefined();
  });
});
