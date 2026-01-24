import tseslint from 'typescript-eslint';
import oxlint from 'eslint-plugin-oxlint';
import eslintPluginImport from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import boundaries from 'eslint-plugin-boundaries';

// =============================================================================
// no-restricted-syntax ルール定義
// =============================================================================

/**
 * 基底ルール: 全TypeScriptファイルに適用される no-restricted-syntax ルール
 * 他の設定でこれを継承・拡張・フィルタリングして使用する
 */
const BASE_RESTRICTED_SYNTAX_RULES = {
  /**
   * throw キーワードを禁止。neverthrow の Result 型を使用すること。
   * 外部ライブラリの例外は fromThrowable で変換する。
   */
  throw: {
    selector: 'ThrowStatement',
    message:
      'throw は禁止です。neverthrow の Result 型（ok/err）を使用してください。外部ライブラリの例外は fromThrowable で変換してください。',
  },
  /**
   * Promise<Result<>> を禁止。ResultAsync を使用すること。
   * 非同期の Result 処理は ResultAsync で統一し、型の一貫性を保つ。
   */
  promiseResult: {
    selector:
      'TSTypeReference[typeName.name="Promise"] > TSTypeParameterInstantiation > TSTypeReference[typeName.name="Result"]:first-child',
    message:
      'Promise<Result<>> は禁止です。ResultAsync を使用してください。fromPromise でラップするか、チェーンメソッド（andThen, map, mapErr）で繋いでください。',
  },
  /**
   * neverthrow のチェーン内でのネストを禁止。
   * andThen のコールバック内で andThen を呼ぶとネストが深くなる。
   * 代わりにコンテキストオブジェクトを引き回すか、ヘルパー関数に切り出してフラットにする。
   */
  nestedAndThen: {
    selector:
      'CallExpression[callee.property.name="andThen"] > :matches(ArrowFunctionExpression, FunctionExpression) CallExpression[callee.property.name="andThen"]',
    message:
      'neverthrow のチェーン内でのネストは禁止です。コンテキストを引き回すか、ヘルパー関数に切り出してフラットなチェーンにしてください。',
  },
  /**
   * as による型アサーションを禁止（as const は許可）。
   * 型注釈は代入時に型チェックが行われるため、より型安全。
   */
  asAssertion: {
    selector: 'TSAsExpression:not([typeAnnotation.typeName.name="const"])',
    message:
      'as による型アサーションは禁止です（as const は許可）。代わりに `const a: Type = value` の形式で型注釈を使用してください。型注釈は代入時に型チェックが行われるため、より型安全です。',
  },
  /**
   * <> による型アサーションを禁止。
   */
  angleAssertion: {
    selector: 'TSTypeAssertion',
    message:
      '<> による型アサーションは禁止です。代わりに `const a: Type = value` の形式で型注釈を使用してください。型注釈は代入時に型チェックが行われるため、より型安全です。',
  },
  /**
   * in 演算子を禁止（型安全性を破壊するため）。
   * 'prop' in obj は任意のプロパティ名でチェック可能で、
   * narrowing 後は unknown 型になり型安全性が失われる。
   * 代わりに ts-pattern の match を使用すること。
   */
  inOperator: {
    selector: 'BinaryExpression[operator="in"]',
    message:
      'in 演算子は型安全性を破壊するため禁止です。ts-pattern の match を使用してください。' +
      '例: match(value).with({ type: "foo" }, ...).exhaustive()',
  },
  /**
   * Object.hasOwn を禁止（型安全性を破壊するため）。
   * in 演算子と同様に、任意のプロパティ名でチェック可能で型安全性が失われる。
   * 代わりに ts-pattern の match を使用すること。
   */
  objectHasOwn: {
    selector: 'CallExpression[callee.object.name="Object"][callee.property.name="hasOwn"]',
    message:
      'Object.hasOwn は型安全性を破壊するため禁止です。ts-pattern の match を使用してください。' +
      '例: match(value).with({ type: "foo" }, ...).exhaustive()',
  },
};

/**
 * ドメイン層追加ルール: packages/core のドメイン層に追加で適用されるルール
 */
const DOMAIN_LAYER_ADDITIONAL_RULES = {
  /**
   * optional property（?:）を禁止。?: never は discriminated union パターンとして許容。
   */
  optionalProperty: {
    selector: 'TSPropertySignature[optional=true]:not(:has(TSTypeAnnotation > TSNeverKeyword))',
    message:
      'ドメイン層でoptional property（?:）は禁止です。' +
      'NoInput 型を使って明示的に表現してください。' +
      '例: email: string | NoInput',
  },
  /**
   * | undefined を禁止。
   */
  unionUndefined: {
    selector: 'TSUnionType > TSUndefinedKeyword',
    message:
      'ドメイン層で | undefined は禁止です。' +
      'NoInput 型を使って明示的に表現してください。' +
      '例: email: string | NoInput',
  },
  /**
   * | null を禁止。
   */
  unionNull: {
    selector: 'TSUnionType > TSNullKeyword',
    message:
      'ドメイン層で | null は禁止です。' +
      'Nothing 型を使って明示的に表現してください。' +
      '例: result: Data | Nothing',
  },
};

/**
 * E2Eテスト追加ルール: E2Eテストファイルに追加で適用されるルール
 */
const E2E_TEST_ADDITIONAL_RULES = {
  viUsage: {
    selector: 'CallExpression[callee.object.name="vi"]',
    message: 'E2Eテストでviの使用は禁止です。実際のシステムを使用してください。',
  },
  mockFunction: {
    selector: 'CallExpression[callee.name="mock"]',
    message: 'E2Eテストでmock関数の使用は禁止です。',
  },
  mockMethod: {
    selector: 'CallExpression[callee.property.name="mock"]',
    message: 'E2Eテストでmockメソッドの使用は禁止です。',
  },
  mockImplementation: {
    selector: 'CallExpression[callee.property.name="mockImplementation"]',
    message: 'E2EテストでmockImplementationの使用は禁止です。',
  },
  mockReturnValue: {
    selector: 'CallExpression[callee.property.name="mockReturnValue"]',
    message: 'E2EテストでmockReturnValueの使用は禁止です。',
  },
  mockResolvedValue: {
    selector: 'CallExpression[callee.property.name="mockResolvedValue"]',
    message: 'E2EテストでmockResolvedValueの使用は禁止です。',
  },
  spyOn: {
    selector: 'CallExpression[callee.property.name="spyOn"]',
    message: 'E2EテストでspyOnの使用は禁止です。',
  },
};

/**
 * index.ts (barrel file) ルール: re-export 以外の記述を禁止
 */
const INDEX_FILE_RULES = {
  variableDeclaration: {
    selector: 'VariableDeclaration',
    message: 'index.ts に変数宣言は禁止です。re-export のみ記述してください。',
  },
  functionDeclaration: {
    selector: 'FunctionDeclaration',
    message: 'index.ts に関数宣言は禁止です。re-export のみ記述してください。',
  },
  classDeclaration: {
    selector: 'ClassDeclaration',
    message: 'index.ts にクラス宣言は禁止です。re-export のみ記述してください。',
  },
  interfaceDeclaration: {
    selector: 'TSInterfaceDeclaration',
    message: 'index.ts にinterface宣言は禁止です。re-export のみ記述してください。',
  },
  typeDeclaration: {
    selector: 'TSTypeAliasDeclaration',
    message: 'index.ts にtype宣言は禁止です。re-export のみ記述してください。',
  },
  importDeclaration: {
    selector: 'ImportDeclaration',
    message:
      'index.ts に import 文は禁止です。export * from または export { ... } from を使用してください。',
  },
  localVariableExport: {
    selector: 'ExportNamedDeclaration:not([source]):has(VariableDeclaration)',
    message: 'index.ts でのローカル変数エクスポートは禁止です。re-export のみ記述してください。',
  },
  localFunctionExport: {
    selector: 'ExportNamedDeclaration:not([source]):has(FunctionDeclaration)',
    message: 'index.ts でのローカル関数エクスポートは禁止です。re-export のみ記述してください。',
  },
  localClassExport: {
    selector: 'ExportNamedDeclaration:not([source]):has(ClassDeclaration)',
    message: 'index.ts でのローカルクラスエクスポートは禁止です。re-export のみ記述してください。',
  },
  exportDefault: {
    selector: 'ExportDefaultDeclaration',
    message: 'index.ts に export default は禁止です。名前付き re-export のみ記述してください。',
  },
};

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * ルールオブジェクトから ESLint の no-restricted-syntax 配列形式に変換する
 * @param {Record<string, {selector: string, message: string}>} rules - ルールオブジェクト
 * @param {string[]} [excludeKeys] - 除外するルールのキー配列
 * @returns {Array<{selector: string, message: string}>} ESLint ルール配列
 */
const buildRestrictedSyntaxRules = (rules, excludeKeys = []) => {
  const excludeSet = new Set(excludeKeys);
  return Object.entries(rules)
    .filter(([key]) => !excludeSet.has(key))
    .map(([, rule]) => rule);
};

/**
 * 複数のルールオブジェクトをマージして ESLint の no-restricted-syntax 配列形式に変換する
 * @param  {...Record<string, {selector: string, message: string}>} ruleObjects - ルールオブジェクト群
 * @returns {Array<{selector: string, message: string}>} ESLint ルール配列
 */
const mergeRestrictedSyntaxRules = (...ruleObjects) => {
  return ruleObjects.flatMap((rules) => Object.values(rules));
};

// =============================================================================
// レイヤー定義
// =============================================================================

/**
 * レイヤー定義
 *
 * 依存方向:
 *   apps → core/orchestrator のみ
 *   core/orchestrator → core/executor, core/loader, core/parser, core/types
 *   core/executor → core/parser, core/types, agent-browser-adapter
 *   core/loader → core/parser, core/types
 *   core/parser → core/types
 *   core/types → agent-browser-adapter (type only)
 *   agent-browser-adapter → (外部のみ)
 */
const LAYER_TYPES = {
  // apps
  APP: 'app',
  // @packages/core 内部のレイヤー
  CORE_ORCHESTRATOR: 'core-orchestrator',
  CORE_EXECUTOR: 'core-executor',
  CORE_LOADER: 'core-loader',
  CORE_PARSER: 'core-parser',
  CORE_TYPES: 'core-types',
  // @packages/agent-browser-adapter
  ADAPTER: 'adapter',
  // その他
  CONFIG: 'config',
  TOOL: 'tool',
};

export default tseslint.config(
  {
    ignores: ['**/node_modules', '**/dist', '**/out'],
  },
  tseslint.configs.recommended,
  ...oxlint.configs['flat/all'], // oxlintで代替えできるruleをoffにする
  /**
   * eslint-plugin-boundaries の設定
   * パッケージ間・モジュール間の依存方向を強制する
   */
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      boundaries: boundaries,
    },
    settings: {
      'boundaries/elements': [
        // apps
        {
          type: LAYER_TYPES.APP,
          pattern: 'apps/*',
          capture: ['app'],
        },
        // @packages/core 内部のレイヤー（より具体的なパターンを先に）
        {
          type: LAYER_TYPES.CORE_ORCHESTRATOR,
          pattern: 'packages/core/src/orchestrator',
          mode: 'folder',
        },
        {
          type: LAYER_TYPES.CORE_EXECUTOR,
          pattern: 'packages/core/src/executor',
          mode: 'folder',
        },
        {
          type: LAYER_TYPES.CORE_LOADER,
          pattern: 'packages/core/src/loader',
          mode: 'folder',
        },
        {
          type: LAYER_TYPES.CORE_PARSER,
          pattern: 'packages/core/src/parser',
          mode: 'folder',
        },
        {
          type: LAYER_TYPES.CORE_TYPES,
          pattern: 'packages/core/src/types',
          mode: 'folder',
        },
        // @packages/agent-browser-adapter
        {
          type: LAYER_TYPES.ADAPTER,
          pattern: 'packages/agent-browser-adapter',
        },
        // 共通パッケージ
        {
          type: LAYER_TYPES.CONFIG,
          pattern: 'packages/config',
        },
        {
          type: LAYER_TYPES.TOOL,
          pattern: 'packages/pnpm-sync',
        },
      ],
      'boundaries/dependency-nodes': ['import'],
      'boundaries/include': ['apps/**/*', 'packages/**/*'],
      // TypeScript のパスエイリアス解決
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
        },
      },
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // apps → core/orchestrator のみ（@packages/core は orchestrator 経由でのみアクセス）
            {
              from: [LAYER_TYPES.APP],
              allow: [LAYER_TYPES.CORE_ORCHESTRATOR, LAYER_TYPES.CONFIG],
            },
            // core/orchestrator → executor, loader, parser, types
            {
              from: [LAYER_TYPES.CORE_ORCHESTRATOR],
              allow: [
                LAYER_TYPES.CORE_EXECUTOR,
                LAYER_TYPES.CORE_LOADER,
                LAYER_TYPES.CORE_PARSER,
                LAYER_TYPES.CORE_TYPES,
                LAYER_TYPES.ADAPTER,
              ],
            },
            // core/executor → parser, types, adapter
            {
              from: [LAYER_TYPES.CORE_EXECUTOR],
              allow: [LAYER_TYPES.CORE_PARSER, LAYER_TYPES.CORE_TYPES, LAYER_TYPES.ADAPTER],
            },
            // core/loader → parser, types
            {
              from: [LAYER_TYPES.CORE_LOADER],
              allow: [LAYER_TYPES.CORE_PARSER, LAYER_TYPES.CORE_TYPES],
            },
            // core/parser → types
            {
              from: [LAYER_TYPES.CORE_PARSER],
              allow: [LAYER_TYPES.CORE_TYPES],
            },
            // core/types → adapter (type only)
            {
              from: [LAYER_TYPES.CORE_TYPES],
              allow: [LAYER_TYPES.ADAPTER],
            },
            // adapter → 外部のみ（何も許可しない）
            {
              from: [LAYER_TYPES.ADAPTER],
              allow: [],
            },
            // config は依存不可
            {
              from: [LAYER_TYPES.CONFIG],
              allow: [],
            },
          ],
        },
      ],
      /**
       * サブパスインポートの禁止
       * @packages/core/sub のようなインポートを禁止し、
       * @packages/core からの barrel export のみを許可する
       */
      'boundaries/no-private': [
        'error',
        {
          allowUncles: false,
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: eslintPluginImport,
      sonarjs: sonarjs,
    },
    rules: {
      complexity: ['error', { max: 7 }],
      'sonarjs/cognitive-complexity': 'error',
      'no-console': 'error',
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'import/no-cycle': 'error',
      /**
       * パッケージ間のサブパスインポートを禁止
       * @packages/domain/sub や @apps/cli/sub のようなインポートを禁止
       * barrel export (index.ts) からのインポートのみを許可
       */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@packages/*/**', '!@packages/*/'],
              message:
                'サブパスインポートは禁止です。barrel export (index.ts) からインポートしてください。',
            },
            {
              group: ['@apps/*/**', '!@apps/*/'],
              message:
                'サブパスインポートは禁止です。barrel export (index.ts) からインポートしてください。',
            },
          ],
        },
      ],
      /**
       * 基底ルール（throw禁止、as禁止、in禁止など）を適用
       * ルール定義は BASE_RESTRICTED_SYNTAX_RULES を参照
       */
      'no-restricted-syntax': [
        'error',
        ...buildRestrictedSyntaxRules(BASE_RESTRICTED_SYNTAX_RULES),
      ],
    },
  },
  /**
   * index.ts (barrel file) のルール
   * re-export 以外の記述を禁止する
   * 許可: export * from, export { ... } from, export {}, export type { ... } from
   * ルール定義は INDEX_FILE_RULES を参照
   */
  {
    files: ['**/index.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...buildRestrictedSyntaxRules(INDEX_FILE_RULES)],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      /**
       * テストファイルでは throw と型アサーションの制限を解除するが、
       * Promise<Result<>> の禁止は維持する（ResultAsync を使用すること）。
       * 除外: throw, asAssertion, angleAssertion, inOperator, objectHasOwn, nestedAndThen
       */
      'no-restricted-syntax': [
        'error',
        ...buildRestrictedSyntaxRules(BASE_RESTRICTED_SYNTAX_RULES, [
          'throw',
          'asAssertion',
          'angleAssertion',
          'inOperator',
          'objectHasOwn',
          'nestedAndThen',
        ]),
      ],
      // テストファイルではサブパスインポート制限を解除
      'no-restricted-imports': 'off',
    },
  },
  /**
   * テストファイル以外で eslint-disable コメントを禁止する。
   * 本番コードでルールを無効化することは、コード品質を低下させるため禁止。
   */
  eslintComments.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@eslint-community/eslint-comments/no-use': [
        'error',
        {
          allow: [],
        },
      ],
    },
  },
  /**
   * example/ ディレクトリではルールを緩和する。
   * サンプルコードなので厳密なルールは不要。
   */
  {
    files: ['example/**/*.{ts,tsx,js,mjs}'],
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': 'off',
      complexity: 'off',
    },
  },
  /**
   * packages/core/src/generator ディレクトリはビルドツールなのでconsole.logのみ許可。
   * 型アサーションと複雑度は許可しない。
   */
  {
    files: ['packages/core/src/generator/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  /**
   * orchestrator層では複雑度ルールを緩和する。
   * アプリケーション層への境界として、多くのoptional引数を扱うため。
   */
  {
    files: ['packages/core/src/orchestrator/**/*.ts'],
    rules: {
      complexity: ['error', { max: 12 }],
    },
  },
  /**
   * execute-step.tsは多くのコマンドハンドラを含むため、max-linesを緩和する。
   */
  {
    files: ['packages/core/src/executor/execute-step.ts'],
    rules: {
      'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],
    },
  },
  /**
   * packages/core（ドメイン層）でのoptional禁止
   * naoya式関数型DDDに基づき、optional/null/undefined を検出
   * 基底ルールに加えてドメイン層専用ルールを追加
   *
   * packages/agent-browser-adapter は外界との境界なので除外
   */
  {
    files: ['packages/core/**/*.ts'],
    ignores: [
      'packages/core/**/*.test.ts',
      'packages/core/**/*.spec.ts',
      'packages/core/src/parser/**/*.ts', // パーサーは外界との境界なので除外
      'packages/core/src/loader/**/*.ts', // ローダーも外界との境界なので除外
      'packages/core/src/orchestrator/**/*.ts', // オーケストレーターはアプリケーション層への公開APIなので除外
      'packages/core/src/generator/**/*.ts', // ジェネレーターはビルドツールなので除外
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...mergeRestrictedSyntaxRules(BASE_RESTRICTED_SYNTAX_RULES, DOMAIN_LAYER_ADDITIONAL_RULES),
      ],
    },
  },
  /**
   * E2Eテストではモックを禁止する。
   * E2Eテストは実際のシステム動作を検証するため、モックの使用は不適切。
   * 基底ルール + E2E専用ルールを適用
   */
  {
    files: ['**/*.e2e.test.{ts,tsx}', '**/*.e2e.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vitest',
              importNames: ['vi'],
              message:
                'E2Eテストでモック（vi）の使用は禁止です。実際のシステムを使用してください。',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...mergeRestrictedSyntaxRules(BASE_RESTRICTED_SYNTAX_RULES, E2E_TEST_ADDITIONAL_RULES),
      ],
    },
  },
  /**
   * テストファイルの配置ルール
   * - __tests__ ディレクトリ内のファイルは禁止（Python方式）
   * - .spec.ts は禁止、.test.ts を使用すること（統一性のため）
   *
   * __tests__ ディレクトリ内のファイルでエラーを発生させることで、
   * 実質的にディレクトリの使用を禁止する
   */
  {
    files: ['**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message:
            '__tests__ ディレクトリは禁止です。テストファイルは xxx.test.ts としてソースファイルと同じディレクトリに配置してください。',
        },
      ],
    },
  },
  /**
   * .spec.ts ファイルは禁止、.test.ts を使用すること
   */
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: '.spec.ts は禁止です。.test.ts を使用してください。',
        },
      ],
    },
  },
);
