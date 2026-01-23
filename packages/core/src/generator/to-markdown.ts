/**
 * Markdownドキュメント生成
 *
 * valibotスキーマからMarkdownドキュメントを自動生成する。
 * スキーマの構造からYAML例を自動生成し、exampleValuesで具体的な値を埋める。
 */

import { match, P } from 'ts-pattern';
import type { GenericSchema } from 'valibot';
import { stringify } from 'yaml';

/**
 * スキーマメタデータの型
 */
interface SchemaMetadata {
  description: string | undefined;
  category: string | undefined;
  exampleValues: string[] | undefined;
}

/**
 * スキーマ情報
 */
export interface SchemaInfo {
  name: string;
  description: string;
  category: string;
  schema: GenericSchema;
}

/**
 * オブジェクトがSchemaMetadataのプロパティを持つか検証
 *
 * @param record - 検証対象のレコード
 * @returns SchemaMetadataの構造を持つ場合true
 */
const validateSchemaMetadataProperties = (record: Record<string, unknown>): boolean => {
  return (
    (record.description === undefined || typeof record.description === 'string') &&
    (record.category === undefined || typeof record.category === 'string') &&
    (record.exampleValues === undefined || Array.isArray(record.exampleValues))
  );
};

/**
 * unknown型の値がSchemaMetadataの構造を持つかチェック
 *
 * @param value - チェック対象の値
 * @returns SchemaMetadataの構造を持つ場合true
 */
const isSchemaMetadata = (value: unknown): value is SchemaMetadata => {
  return match(value)
    .with(P.nullish, () => false)
    .with(P.not(P.instanceOf(Object)), () => false)
    .with(P._, (obj): boolean => {
      // unknown型をRecord<string, unknown>に変換するための型チェック
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return false;
      }
      // Object.entriesとObject.fromEntriesを使って安全に変換
      const record: Record<string, unknown> = Object.fromEntries(Object.entries(obj));
      return validateSchemaMetadataProperties(record);
    })
    .exhaustive();
};

/**
 * スキーマからメタデータを取得（内部実装）
 *
 * @param schema - valibotスキーマ（unknown型として処理）
 * @returns メタデータ
 */
const getMetadataInternal = (schema: unknown): SchemaMetadata => {
  return match(schema)
    .with({ metadata: P.select() }, (metadata): SchemaMetadata => {
      if (isSchemaMetadata(metadata)) {
        return metadata;
      }
      return {
        description: undefined,
        category: undefined,
        exampleValues: undefined,
      };
    })
    .otherwise(
      (): SchemaMetadata => ({
        description: undefined,
        category: undefined,
        exampleValues: undefined,
      }),
    );
};

/**
 * pipeアイテムからdescriptionを探す
 *
 * @param pipe - pipeの配列
 * @returns description文字列またはundefined
 */
const extractDescriptionFromPipe = (pipe: unknown[]): string | undefined => {
  for (const item of pipe) {
    const desc = match(item)
      .with({ type: 'description', message: P.string.select() }, (message) => message)
      .otherwise(() => undefined);

    if (desc !== undefined) {
      return desc;
    }
  }
  return undefined;
};

/**
 * スキーマからdescriptionを取得（内部実装）
 *
 * @param schema - valibotスキーマ（unknown型として処理）
 * @returns description文字列
 */
const getDescriptionInternal = (schema: unknown): string => {
  return match(schema)
    .with({ pipe: P.array().select() }, (pipe) => {
      const desc = extractDescriptionFromPipe(pipe);
      return desc ?? getMetadataInternal(schema).description ?? '';
    })
    .otherwise(() => getMetadataInternal(schema).description ?? '');
};

/**
 * スキーマからdescriptionを取得
 *
 * @param schema - valibotスキーマ
 * @returns description文字列
 */
const getDescription = (schema: GenericSchema): string => {
  return getDescriptionInternal(schema);
};

/**
 * pipeアイテムからexampleValuesを探す
 *
 * @param pipe - pipeの配列
 * @returns exampleValues配列またはundefined
 */
const extractExampleValuesFromPipe = (pipe: unknown[]): string[] | undefined => {
  for (const item of pipe) {
    const values = match(item)
      .with({ metadata: { exampleValues: P.array().select() } }, (values): string[] | undefined => {
        // unknown[]をstring[]に変換するための型チェック
        if (!Array.isArray(values)) return undefined;
        // 全ての要素がstringであることを確認
        if (!values.every((v): v is string => typeof v === 'string')) return undefined;
        return values;
      })
      .otherwise(() => undefined);

    if (values !== undefined && values.length > 0) {
      return values;
    }
  }
  return undefined;
};

/**
 * スキーマからexampleValuesを再帰的に探索（内部実装）
 *
 * @param schema - valibotスキーマ（unknown型として処理）
 * @returns 見つかったexampleValues、なければundefined
 */
const findExampleValuesInternal = (schema: unknown): string[] | undefined => {
  // 直接のmetadataを確認
  const metadata = getMetadataInternal(schema);
  if (metadata.exampleValues !== undefined && metadata.exampleValues.length > 0) {
    return metadata.exampleValues;
  }

  // pipeの場合、各要素を確認
  return match(schema)
    .with({ pipe: P.array().select() }, (pipe) => extractExampleValuesFromPipe(pipe))
    .otherwise(() => undefined);
};

/**
 * string型スキーマからexampleValuesがある場合の値を取得
 *
 * @param baseSchema - pipeの最初のスキーマ
 * @param exampleValues - example値の配列
 * @returns example値またはundefined
 */
const getStringExampleValue = (
  baseSchema: unknown,
  exampleValues: string[] | undefined,
): string | undefined => {
  return match({ baseSchema, exampleValues })
    .with(
      { baseSchema: { type: 'string' }, exampleValues: P.array().select() },
      (values): string | undefined => {
        if (!Array.isArray(values) || values.length === 0) return undefined;
        const firstValue: string = String(values[0]);
        return firstValue;
      },
    )
    .otherwise(() => undefined);
};

/**
 * pipe型スキーマから構造を構築（内部実装）
 *
 * @param schema - スキーマ（unknown型として処理）
 * @returns 構造を表すオブジェクト、または次のスキーマ処理を促すundefined
 */
const buildPipeStructureInternal = (schema: unknown): unknown | undefined => {
  return match(schema)
    .with({ pipe: P.array().select() }, (pipe) => {
      const exampleValues = findExampleValuesInternal(schema);
      const baseSchema = pipe[0];

      if (baseSchema === undefined) {
        return undefined;
      }

      // string型でexampleValuesがある場合はそれを使用
      const stringExample = getStringExampleValue(baseSchema, exampleValues);
      if (stringExample !== undefined) {
        return stringExample;
      }

      return buildStructureInternal(baseSchema);
    })
    .otherwise(() => undefined);
};

/**
 * オブジェクトフィールドの値を構築（内部実装）
 *
 * @param valueSchema - フィールドのスキーマ（unknown型として処理）
 * @returns 構築された値
 */
const buildFieldValueInternal = (valueSchema: unknown): unknown => {
  return match(valueSchema)
    .with({ pipe: P.array().select() }, (pipe) => {
      // pipeの場合、metadataからexampleValuesを探す
      const exampleValues = extractExampleValuesFromPipe(pipe);
      if (exampleValues !== undefined) {
        return exampleValues[0];
      }
      return buildStructureInternal(valueSchema);
    })
    .otherwise(() => buildStructureInternal(valueSchema));
};

/**
 * object型スキーマから構造を構築（内部実装）
 *
 * @param schema - スキーマ（unknown型として処理）
 * @returns 構造を表すオブジェクト、または次のスキーマ処理を促すundefined
 */
const buildObjectStructureInternal = (schema: unknown): Record<string, unknown> | undefined => {
  return match(schema)
    .with({ type: 'object', entries: P.select() }, (entries) => {
      const obj: Record<string, unknown> = {};

      // unknown型をObject.entries()で扱えるようにする型チェック
      if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) {
        return obj;
      }

      for (const [key, valueSchema] of Object.entries(entries)) {
        obj[key] = buildFieldValueInternal(valueSchema);
      }

      return obj;
    })
    .otherwise(() => undefined);
};

/**
 * union型スキーマから構造を構築（内部実装）
 *
 * @param schema - スキーマ（unknown型として処理）
 * @returns 構造を表すオブジェクト、または次のスキーマ処理を促すundefined
 */
const buildUnionStructureInternal = (
  schema: unknown,
): { __union_options__: unknown[] } | undefined => {
  return match(schema)
    .with({ type: 'union', options: P.array().select() }, (options) => ({
      __union_options__: options.map((opt): unknown => buildStructureInternal(opt)),
    }))
    .otherwise(() => undefined);
};

/**
 * picklist型スキーマから構造を構築（内部実装）
 *
 * @param schema - スキーマ（unknown型として処理）
 * @returns 最初のオプション、またはundefined
 */
const buildPicklistStructureInternal = (schema: unknown): string | undefined => {
  return match(schema)
    .with({ type: 'picklist', options: P.array().select() }, (options) => {
      if (options.length > 0) {
        return String(options[0]);
      }
      return undefined;
    })
    .otherwise(() => undefined);
};

/**
 * optional型スキーマから構造を構築（内部実装）
 *
 * @param schema - スキーマ（unknown型として処理）
 * @returns ラップされた型の構造、またはundefined
 */
const buildOptionalStructureInternal = (schema: unknown): unknown | undefined => {
  return match(schema)
    .with({ type: 'optional', wrapped: P.select() }, (wrapped) => {
      return buildStructureInternal(wrapped);
    })
    .otherwise(() => undefined);
};

/**
 * プリミティブ型スキーマから構造を構築（内部実装）
 *
 * @param schema - スキーマ（unknown型として処理）
 * @returns 構造を表す文字列、または次のスキーマ処理を促すundefined
 */
const buildPrimitiveStructureInternal = (schema: unknown): string | undefined => {
  return match(schema)
    .with({ type: 'string' }, () => {
      const exampleValues = findExampleValuesInternal(schema);
      if (exampleValues !== undefined && exampleValues.length > 0) {
        return exampleValues[0];
      }
      return '<string>';
    })
    .with({ type: 'number' }, () => '<number>')
    .with({ type: 'boolean' }, () => '<boolean>')
    .otherwise(() => undefined);
};

/**
 * スキーマの構造を走査してオブジェクト形式に変換（内部実装）
 *
 * @param schema - valibotスキーマ（unknown型として処理）
 * @returns 構造を表すオブジェクト
 */
const buildStructureInternal = (schema: unknown): unknown => {
  // pipe型の場合
  const pipeResult = buildPipeStructureInternal(schema);
  if (pipeResult !== undefined) {
    return pipeResult;
  }

  // object型
  const objectResult = buildObjectStructureInternal(schema);
  if (objectResult !== undefined) {
    return objectResult;
  }

  // union型
  const unionResult = buildUnionStructureInternal(schema);
  if (unionResult !== undefined) {
    return unionResult;
  }

  // optional型
  const optionalResult = buildOptionalStructureInternal(schema);
  if (optionalResult !== undefined) {
    return optionalResult;
  }

  // picklist型
  const picklistResult = buildPicklistStructureInternal(schema);
  if (picklistResult !== undefined) {
    return picklistResult;
  }

  // プリミティブ型
  const primitiveResult = buildPrimitiveStructureInternal(schema);
  if (primitiveResult !== undefined) {
    return primitiveResult;
  }

  return '<unknown>';
};

/**
 * スキーマの構造を走査してオブジェクト形式に変換
 *
 * @param schema - valibotスキーマ
 * @returns 構造を表すオブジェクト
 */
const buildStructure = (schema: GenericSchema): unknown => {
  return buildStructureInternal(schema);
};

/**
 * union optionsマーカーを持つオブジェクトかどうかを判定
 */
const isUnionOptions = (value: unknown): value is { __union_options__: unknown[] } => {
  return match(value)
    .with({ __union_options__: P.array() }, () => true)
    .otherwise(() => false);
};

/**
 * オブジェクトのフィールドにunionがあるかチェックし、展開する
 *
 * @param obj - 対象オブジェクト
 * @returns 展開された配列、またはundefined（展開不要）
 */
const expandUnionInObject = (obj: Record<string, unknown>): unknown[] | undefined => {
  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    if (isUnionOptions(value)) {
      // このフィールドがunionの場合、各オプションで新しいオブジェクトを生成
      return value.__union_options__.flatMap((opt) => {
        const newObj = { ...obj, [key]: opt };
        return flattenStructure(newObj);
      });
    }
  }

  return undefined;
};

/**
 * オブジェクトのネストしたフィールドを再帰的に展開する
 *
 * @param obj - 対象オブジェクト
 * @returns 展開された配列、またはundefined（展開不要）
 */
const expandNestedInObject = (obj: Record<string, unknown>): unknown[] | undefined => {
  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const flattened = flattenStructure(value);
      if (flattened.length > 1) {
        // 複数の結果がある場合、各結果で新しいオブジェクトを生成
        return flattened.flatMap((flattenedValue) => {
          const newObj = { ...obj, [key]: flattenedValue };
          return flattenStructure(newObj);
        });
      }
    }
  }

  return undefined;
};

/**
 * 構造を再帰的に平坦化してYAML例のリストを生成
 *
 * unionマーカーを展開して、各オプションを個別の例として返す。
 * ネストしたオブジェクト内のunionも処理する。
 */
const flattenStructure = (structure: unknown): unknown[] => {
  if (isUnionOptions(structure)) {
    // unionの各オプションを展開
    return structure.__union_options__.flatMap((opt) => flattenStructure(opt));
  }

  if (typeof structure === 'object' && structure !== null && !Array.isArray(structure)) {
    // Object.entriesとObject.fromEntriesを使って安全にRecord<string, unknown>に変換
    const obj: Record<string, unknown> = Object.fromEntries(Object.entries(structure));

    // 各フィールドでunionマーカーを再帰的に探す
    const unionExpanded = expandUnionInObject(obj);
    if (unionExpanded !== undefined) {
      return unionExpanded;
    }

    // ネストしたオブジェクト内のunionも処理
    const nestedExpanded = expandNestedInObject(obj);
    if (nestedExpanded !== undefined) {
      return nestedExpanded;
    }
  }

  // それ以外はそのまま返す
  return [structure];
};

/**
 * スキーマからYAML例を生成
 *
 * unionの場合は各オプションごとに例を生成する。
 *
 * @param schema - valibotスキーマ
 * @returns YAML例の配列
 */
const generateYamlExamples = (schema: GenericSchema): string[] => {
  const structure = buildStructure(schema);
  const flattened = flattenStructure(structure);

  return flattened.map((item) => stringify([item], { indent: 2 }).trim());
};

/**
 * コマンドスキーマからMarkdownドキュメントを生成
 *
 * @param schemaInfo - スキーマ情報
 * @returns Markdownドキュメント
 */
const generateCommandDoc = (schemaInfo: SchemaInfo): string => {
  const examples = generateYamlExamples(schemaInfo.schema);
  const description = schemaInfo.description || getDescription(schemaInfo.schema);

  return `## ${schemaInfo.name}

**Category**: ${schemaInfo.category}

${description}

### Usage Examples

\`\`\`yaml
${examples.join('\n\n')}
\`\`\`
`;
};

/**
 * 全コマンドのMarkdownドキュメントを生成
 *
 * @param schemas - スキーマ情報の配列
 * @returns 完全なMarkdownドキュメント
 */
const generateMarkdown = (schemas: SchemaInfo[]): string => {
  const header = `# YAML Flow Reference

This document is auto-generated from Valibot schemas.

`;

  const body = schemas.map(generateCommandDoc).join('\n---\n\n');

  return header + body;
};

/**
 * pipeからcategoryを抽出
 *
 * @param pipe - pipeの配列
 * @returns category文字列またはundefined
 */
const extractCategoryFromPipe = (pipe: unknown[]): string | undefined => {
  for (const item of pipe) {
    const category = match(item)
      .with({ metadata: { category: P.string.select() } }, (cat) => cat)
      .otherwise(() => undefined);

    if (category !== undefined) {
      return category;
    }
  }
  return undefined;
};

/**
 * スキーマからcategoryを取得
 *
 * @param schema - valibotスキーマ
 * @returns category文字列
 */
const getCategory = (schema: GenericSchema): string => {
  const schemaAsUnknown: unknown = schema;
  return match(schemaAsUnknown)
    .with({ pipe: P.array().select() }, (pipe) => {
      const category = extractCategoryFromPipe(pipe);
      return category ?? getMetadataInternal(schema).category ?? 'Other';
    })
    .otherwise(() => getMetadataInternal(schema).category ?? 'Other');
};

/**
 * CommandSchemaEntryからSchemaInfoを生成
 *
 * スキーマ自体からdescriptionとcategoryを抽出する。
 *
 * @param entry - コマンドスキーマエントリ
 * @returns スキーマ情報
 */
const entryToSchemaInfo = (entry: { name: string; schema: GenericSchema }): SchemaInfo => ({
  name: entry.name,
  description: getDescription(entry.schema),
  category: getCategory(entry.schema),
  schema: entry.schema,
});

/**
 * コマンドレジストリからMarkdownドキュメントを生成
 *
 * commandSchemas（SSoT）から直接ドキュメントを生成する。
 * 各スキーマからdescription、categoryを自動抽出する。
 *
 * @param entries - コマンドスキーマエントリの配列
 * @returns 完全なMarkdownドキュメント
 */
export const generateMarkdownFromRegistry = (
  entries: Array<{ name: string; schema: GenericSchema }>,
): string => {
  const schemaInfos = entries.map(entryToSchemaInfo);
  return generateMarkdown(schemaInfos);
};
