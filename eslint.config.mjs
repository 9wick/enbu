import tseslint from 'typescript-eslint';
import oxlint from 'eslint-plugin-oxlint';
import eslintPluginImport from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import boundaries from 'eslint-plugin-boundaries';

/**
 * レイヤー定義（DDD風）
 * 依存方向: apps -> presentation -> application -> infrastructure -> core
 * config は全レイヤーから参照可能
 */
const LAYER_TYPES = {
  APP: 'app',
  PRESENTATION: 'presentation',
  APPLICATION: 'application',
  INFRASTRUCTURE: 'infrastructure',
  CORE: 'core',
  CONFIG: 'config',
  TOOL: 'tool',
};

/**
 * 各レイヤーが依存可能なレイヤーの定義
 */
const ALLOWED_DEPENDENCIES = {
  [LAYER_TYPES.APP]: [
    LAYER_TYPES.PRESENTATION,
    LAYER_TYPES.APPLICATION,
    LAYER_TYPES.INFRASTRUCTURE,
    LAYER_TYPES.CORE,
    LAYER_TYPES.CONFIG,
  ],
  [LAYER_TYPES.PRESENTATION]: [
    LAYER_TYPES.APPLICATION,
    LAYER_TYPES.INFRASTRUCTURE,
    LAYER_TYPES.CORE,
    LAYER_TYPES.CONFIG,
  ],
  [LAYER_TYPES.APPLICATION]: [LAYER_TYPES.INFRASTRUCTURE, LAYER_TYPES.CORE, LAYER_TYPES.CONFIG],
  [LAYER_TYPES.INFRASTRUCTURE]: [LAYER_TYPES.CORE, LAYER_TYPES.CONFIG],
  [LAYER_TYPES.CORE]: [LAYER_TYPES.CONFIG],
  [LAYER_TYPES.CONFIG]: [],
  [LAYER_TYPES.TOOL]: [],
};

export default tseslint.config(
  {
    ignores: ['**/node_modules', '**/dist', '**/out'],
  },
  tseslint.configs.recommended,
  ...oxlint.configs['flat/all'], // oxlintで代替えできるruleをoffにする
  /**
   * eslint-plugin-boundaries の設定
   * DDD風のレイヤー構造を強制する
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
        // packages - レイヤー別
        {
          type: LAYER_TYPES.CORE,
          pattern: 'packages/core',
        },
        {
          type: LAYER_TYPES.INFRASTRUCTURE,
          pattern: 'packages/infrastructure',
        },
        {
          type: LAYER_TYPES.APPLICATION,
          pattern: 'packages/application',
        },
        {
          type: LAYER_TYPES.PRESENTATION,
          pattern: 'packages/presentation',
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
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // apps は全 packages を参照可能
            {
              from: [LAYER_TYPES.APP],
              allow: ALLOWED_DEPENDENCIES[LAYER_TYPES.APP],
            },
            // presentation -> application, infrastructure, domain, config
            {
              from: [LAYER_TYPES.PRESENTATION],
              allow: ALLOWED_DEPENDENCIES[LAYER_TYPES.PRESENTATION],
            },
            // application -> infrastructure, domain, config
            {
              from: [LAYER_TYPES.APPLICATION],
              allow: ALLOWED_DEPENDENCIES[LAYER_TYPES.APPLICATION],
            },
            // infrastructure -> domain, config
            {
              from: [LAYER_TYPES.INFRASTRUCTURE],
              allow: ALLOWED_DEPENDENCIES[LAYER_TYPES.INFRASTRUCTURE],
            },
            // core -> config のみ
            {
              from: [LAYER_TYPES.CORE],
              allow: ALLOWED_DEPENDENCIES[LAYER_TYPES.CORE],
            },
            // config は依存不可
            {
              from: [LAYER_TYPES.CONFIG],
              allow: ALLOWED_DEPENDENCIES[LAYER_TYPES.CONFIG],
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
       * throw キーワードを禁止。neverthrow の Result 型を使用すること。
       * 外部ライブラリの例外は fromThrowable で変換する。
       */
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ThrowStatement',
          message:
            'throw は禁止です。neverthrow の Result 型（ok/err）を使用してください。外部ライブラリの例外は fromThrowable で変換してください。',
        },
        /**
         * Promise<Result<>> を禁止。ResultAsync を使用すること。
         * 非同期の Result 処理は ResultAsync で統一し、型の一貫性を保つ。
         */
        {
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
        {
          selector:
            'CallExpression[callee.property.name="andThen"] > :matches(ArrowFunctionExpression, FunctionExpression) CallExpression[callee.property.name="andThen"]',
          message:
            'neverthrow のチェーン内でのネストは禁止です。コンテキストを引き回すか、ヘルパー関数に切り出してフラットなチェーンにしてください。',
        },
        {
          selector: 'TSAsExpression:not([typeAnnotation.typeName.name="const"])',
          message:
            'as による型アサーションは禁止です（as const は許可）。代わりに `const a: Type = value` の形式で型注釈を使用してください。型注釈は代入時に型チェックが行われるため、より型安全です。',
        },
        {
          selector: 'TSTypeAssertion',
          message:
            '<> による型アサーションは禁止です。代わりに `const a: Type = value` の形式で型注釈を使用してください。型注釈は代入時に型チェックが行われるため、より型安全です。',
        },
      ],
    },
  },
  /**
   * index.ts (barrel file) のルール
   * re-export 以外の記述を禁止する
   * 許可: export * from, export { ... } from, export {}, export type { ... } from
   */
  {
    files: ['**/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // 変数宣言を禁止
        {
          selector: 'VariableDeclaration',
          message: 'index.ts に変数宣言は禁止です。re-export のみ記述してください。',
        },
        // 関数宣言を禁止
        {
          selector: 'FunctionDeclaration',
          message: 'index.ts に関数宣言は禁止です。re-export のみ記述してください。',
        },
        // クラス宣言を禁止
        {
          selector: 'ClassDeclaration',
          message: 'index.ts にクラス宣言は禁止です。re-export のみ記述してください。',
        },
        // interface/type 宣言を禁止（re-export は許可）
        {
          selector: 'TSInterfaceDeclaration',
          message: 'index.ts にinterface宣言は禁止です。re-export のみ記述してください。',
        },
        {
          selector: 'TSTypeAliasDeclaration',
          message: 'index.ts にtype宣言は禁止です。re-export のみ記述してください。',
        },
        // import文を禁止（re-exportは export ... from で行う）
        {
          selector: 'ImportDeclaration',
          message:
            'index.ts に import 文は禁止です。export * from または export { ... } from を使用してください。',
        },
        // ローカルエクスポート（from なしの export）を禁止（export {} は例外）
        {
          selector: 'ExportNamedDeclaration:not([source]):has(VariableDeclaration)',
          message:
            'index.ts でのローカル変数エクスポートは禁止です。re-export のみ記述してください。',
        },
        {
          selector: 'ExportNamedDeclaration:not([source]):has(FunctionDeclaration)',
          message:
            'index.ts でのローカル関数エクスポートは禁止です。re-export のみ記述してください。',
        },
        {
          selector: 'ExportNamedDeclaration:not([source]):has(ClassDeclaration)',
          message:
            'index.ts でのローカルクラスエクスポートは禁止です。re-export のみ記述してください。',
        },
        // export default を禁止
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'index.ts に export default は禁止です。名前付き re-export のみ記述してください。',
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      /**
       * テストファイルでは throw と型アサーションの制限を解除するが、
       * Promise<Result<>> の禁止は維持する（ResultAsync を使用すること）。
       */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TSTypeReference[typeName.name="Promise"] > TSTypeParameterInstantiation > TSTypeReference[typeName.name="Result"]:first-child',
          message:
            'Promise<Result<>> は禁止です。ResultAsync を使用してください。fromPromise でラップするか、チェーンメソッド（andThen, map, mapErr）で繋いでください。',
        },
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
   * example/ ディレクトリでは no-console を許可する。
   * サンプルコードではデバッグ出力や動作確認のための console.log が有用なため。
   */
  {
    files: ['example/**/*.{ts,tsx,js,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },
  /**
   * E2Eテストではモックを禁止する。
   * E2Eテストは実際のシステム動作を検証するため、モックの使用は不適切。
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
        {
          selector: 'CallExpression[callee.object.name="vi"]',
          message: 'E2Eテストでviの使用は禁止です。実際のシステムを使用してください。',
        },
        {
          selector: 'CallExpression[callee.name="mock"]',
          message: 'E2Eテストでmock関数の使用は禁止です。',
        },
        {
          selector: 'CallExpression[callee.property.name="mock"]',
          message: 'E2Eテストでmockメソッドの使用は禁止です。',
        },
        {
          selector: 'CallExpression[callee.property.name="mockImplementation"]',
          message: 'E2EテストでmockImplementationの使用は禁止です。',
        },
        {
          selector: 'CallExpression[callee.property.name="mockReturnValue"]',
          message: 'E2EテストでmockReturnValueの使用は禁止です。',
        },
        {
          selector: 'CallExpression[callee.property.name="mockResolvedValue"]',
          message: 'E2EテストでmockResolvedValueの使用は禁止です。',
        },
        {
          selector: 'CallExpression[callee.property.name="spyOn"]',
          message: 'E2EテストでspyOnの使用は禁止です。',
        },
        {
          selector: 'TSAsExpression:not([typeAnnotation.typeName.name="const"])',
          message:
            'as による型アサーションは禁止です（as const は許可）。代わりに `const a: Type = value` の形式で型注釈を使用してください。型注釈は代入時に型チェックが行われるため、より型安全です。',
        },
        {
          selector: 'TSTypeAssertion',
          message:
            '<> による型アサーションは禁止です。代わりに `const a: Type = value` の形式で型注釈を使用してください。型注釈は代入時に型チェックが行われるため、より型安全です。',
        },
      ],
    },
  },
);
