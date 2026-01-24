/**
 * コマンドレジストリ（Single Source of Truth）
 *
 * 全コマンドのスキーマをここで一元管理する。
 * normalizers、ドキュメント生成、JSON Schema生成は全てここから導出される。
 *
 * 新しいコマンドを追加する場合:
 * 1. スキーマファイルを作成（例: foo.schema.ts）
 * 2. このファイルのcommandSchemasに追加
 * 3. 自動的にnormalizers、ドキュメント、JSON Schemaに反映される
 */

import type { BaseIssue, GenericSchema } from 'valibot';
import type { Command } from '../../types';
import { CheckYamlSchema, UncheckYamlSchema } from './commands/checkbox.schema';
import { ClickYamlSchema } from './commands/click.schema';
import { DblclickYamlSchema } from './commands/dblclick.schema';
import { DragYamlSchema } from './commands/drag.schema';
import { FocusYamlSchema } from './commands/focus.schema';
import { HoverYamlSchema } from './commands/hover.schema';
import { ScrollIntoViewYamlSchema } from './commands/scrollIntoView.schema';
import { ScrollYamlSchema } from './commands/scroll.schema';
import { WaitYamlSchema } from './commands/wait.schema';
import {
  AssertVisibleYamlSchema,
  AssertNotVisibleYamlSchema,
  AssertEnabledYamlSchema,
  AssertCheckedYamlSchema,
} from './commands/assertions.schema';
import { TypeYamlSchema, FillYamlSchema, SelectYamlSchema } from './commands/input.schema';
import {
  OpenYamlSchema,
  PressYamlSchema,
  KeydownYamlSchema,
  KeyupYamlSchema,
  ScreenshotYamlSchema,
  PdfYamlSchema,
  EvalYamlSchema,
} from './commands/simple.schema';
import { UploadYamlSchema } from './commands/upload.schema';

/**
 * コマンドスキーマ型（出力型をCommand型に絞り込み）
 *
 * GenericSchemaの第2型パラメータでCommand型を指定することで、
 * safeParseの結果がCommand型として型推論される。
 */
export type CommandSchema = GenericSchema<unknown, Command, BaseIssue<unknown>>;

/**
 * コマンドスキーマのメタデータ
 *
 * スキーマ自体にdescriptionとcategoryがmetadataとして含まれているため、
 * ここではnameとschemaのみを保持する。
 */
export interface CommandSchemaEntry {
  /** コマンド名（YAMLのキー名） */
  name: string;
  /** valibotスキーマ（出力型はCommand） */
  schema: CommandSchema;
}

/**
 * 全コマンドスキーマのレジストリ（Single Source of Truth）
 *
 * 順序は関係ない。全てのコマンドがここに登録されている必要がある。
 * スキーマには以下のメタデータが含まれている:
 * - v.description('...') - コマンドの説明
 * - v.metadata({ category: '...' }) - カテゴリ
 */
export const commandSchemas: CommandSchemaEntry[] = [
  // ナビゲーション
  { name: 'open', schema: OpenYamlSchema },
  { name: 'scroll', schema: ScrollYamlSchema },
  { name: 'scrollIntoView', schema: ScrollIntoViewYamlSchema },

  // インタラクション
  { name: 'click', schema: ClickYamlSchema },
  { name: 'dblclick', schema: DblclickYamlSchema },
  { name: 'hover', schema: HoverYamlSchema },
  { name: 'focus', schema: FocusYamlSchema },
  { name: 'type', schema: TypeYamlSchema },
  { name: 'fill', schema: FillYamlSchema },
  { name: 'select', schema: SelectYamlSchema },
  { name: 'press', schema: PressYamlSchema },
  { name: 'keydown', schema: KeydownYamlSchema },
  { name: 'keyup', schema: KeyupYamlSchema },
  { name: 'check', schema: CheckYamlSchema },
  { name: 'uncheck', schema: UncheckYamlSchema },
  { name: 'drag', schema: DragYamlSchema },
  { name: 'upload', schema: UploadYamlSchema },

  // 待機
  { name: 'wait', schema: WaitYamlSchema },

  // キャプチャ
  { name: 'screenshot', schema: ScreenshotYamlSchema },
  { name: 'pdf', schema: PdfYamlSchema },

  // 検証
  { name: 'assertVisible', schema: AssertVisibleYamlSchema },
  { name: 'assertNotVisible', schema: AssertNotVisibleYamlSchema },
  { name: 'assertEnabled', schema: AssertEnabledYamlSchema },
  { name: 'assertChecked', schema: AssertCheckedYamlSchema },

  // その他
  { name: 'eval', schema: EvalYamlSchema },
];
