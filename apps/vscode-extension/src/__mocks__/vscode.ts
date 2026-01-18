/**
 * VSCode APIのモック
 *
 * テスト用にVSCode APIを模倣する。
 * 実際のVSCode環境外でテストを実行可能にする。
 */

import { vi } from 'vitest';

/**
 * Uriクラスのモック
 */
export class Uri {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;
  readonly query: string;
  readonly fragment: string;
  readonly fsPath: string;

  private constructor(
    scheme: string,
    authority: string,
    path: string,
    query: string,
    fragment: string,
  ) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = path;
  }

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    return new Uri('file', '', value, '', '');
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}

/**
 * Rangeクラスのモック
 */
export class Range {
  readonly start: Position;
  readonly end: Position;

  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
    this.start = new Position(startLine, startCharacter);
    this.end = new Position(endLine, endCharacter);
  }
}

/**
 * Positionクラスのモック
 */
export class Position {
  readonly line: number;
  readonly character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

/**
 * Locationクラスのモック
 */
export class Location {
  readonly uri: Uri;
  readonly range: Range;

  constructor(uri: Uri, rangeOrPosition: Range | Position) {
    this.uri = uri;
    if (rangeOrPosition instanceof Range) {
      this.range = rangeOrPosition;
    } else {
      this.range = new Range(
        rangeOrPosition.line,
        rangeOrPosition.character,
        rangeOrPosition.line,
        rangeOrPosition.character,
      );
    }
  }
}

/**
 * TestMessageクラスのモック
 */
export class TestMessage {
  message: string;
  location?: Location;

  constructor(message: string) {
    this.message = message;
  }
}

/**
 * TestRunProfileKindの定義
 */
export const TestRunProfileKind = {
  Run: 1,
  Debug: 2,
  Coverage: 3,
} as const;

/**
 * モックTestItemの型定義
 */
export interface MockTestItem {
  id: string;
  label: string;
  uri?: Uri;
  range?: Range;
  parent?: MockTestItem;
  children: MockTestItemCollection;
  canResolveChildren: boolean;
  busy: boolean;
  tags: unknown[];
  error?: string;
}

/**
 * MockTestItemCollectionクラス
 */
export class MockTestItemCollection {
  private items = new Map<string, MockTestItem>();

  add(item: MockTestItem): void {
    this.items.set(item.id, item);
  }

  delete(id: string): void {
    this.items.delete(id);
  }

  get(id: string): MockTestItem | undefined {
    return this.items.get(id);
  }

  replace(items: MockTestItem[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  forEach(callback: (item: MockTestItem, collection: MockTestItemCollection) => void): void {
    for (const item of this.items.values()) {
      callback(item, this);
    }
  }

  get size(): number {
    return this.items.size;
  }

  [Symbol.iterator](): IterableIterator<[string, MockTestItem]> {
    return this.items.entries();
  }
}

/**
 * テスト実行の記録を保持する型
 */
export interface TestRunRecord {
  type: 'started' | 'passed' | 'failed' | 'errored' | 'skipped' | 'enqueued';
  item: MockTestItem;
  message?: TestMessage;
  duration?: number;
}

/**
 * MockTestRunクラス
 */
export class MockTestRun {
  readonly records: TestRunRecord[] = [];

  started(item: MockTestItem): void {
    this.records.push({ type: 'started', item });
  }

  passed(item: MockTestItem, duration?: number): void {
    this.records.push({ type: 'passed', item, duration });
  }

  failed(item: MockTestItem, message: TestMessage, duration?: number): void {
    this.records.push({ type: 'failed', item, message, duration });
  }

  errored(item: MockTestItem, message: TestMessage): void {
    this.records.push({ type: 'errored', item, message });
  }

  skipped(item: MockTestItem): void {
    this.records.push({ type: 'skipped', item });
  }

  enqueued(item: MockTestItem): void {
    this.records.push({ type: 'enqueued', item });
  }

  end(): void {
    // テスト終了
  }
}

/**
 * MockTestControllerクラス
 */
export class MockTestController {
  readonly id: string;
  readonly label: string;
  readonly items: MockTestItemCollection;
  private profiles: unknown[] = [];
  private testItemIdCounter = 0;

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
    this.items = new MockTestItemCollection();
  }

  createTestItem(id: string, label: string, uri?: Uri): MockTestItem {
    const item: MockTestItem = {
      id,
      label,
      uri,
      children: new MockTestItemCollection(),
      canResolveChildren: false,
      busy: false,
      tags: [],
    };
    return item;
  }

  createRunProfile(
    label: string,
    kind: number,
    runHandler: (request: unknown, token: unknown) => Promise<void>,
    isDefault?: boolean,
  ): { dispose: () => void } {
    const profile = { label, kind, runHandler, isDefault };
    this.profiles.push(profile);
    return { dispose: vi.fn() };
  }

  createTestRun(_request: unknown): MockTestRun {
    return new MockTestRun();
  }

  dispose(): void {
    // クリーンアップ
  }
}

/**
 * MockCancellationTokenクラス
 */
export class MockCancellationToken {
  private _isCancellationRequested = false;
  private listeners: Array<() => void> = [];

  get isCancellationRequested(): boolean {
    return this._isCancellationRequested;
  }

  onCancellationRequested(listener: () => void): { dispose: () => void } {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
          this.listeners.splice(index, 1);
        }
      },
    };
  }

  cancel(): void {
    this._isCancellationRequested = true;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/**
 * MockTextLineクラス
 */
export class MockTextLine {
  readonly lineNumber: number;
  readonly text: string;
  readonly range: Range;

  constructor(lineNumber: number, text: string) {
    this.lineNumber = lineNumber;
    this.text = text;
    this.range = new Range(lineNumber, 0, lineNumber, text.length);
  }
}

/**
 * MockTextDocumentクラス
 */
export class MockTextDocument {
  readonly uri: Uri;
  private content: string;
  private lines: string[];

  constructor(uri: Uri, content: string) {
    this.uri = uri;
    this.content = content;
    this.lines = content.split('\n');
  }

  getText(): string {
    return this.content;
  }

  lineAt(line: number): MockTextLine {
    const text = this.lines[line] ?? '';
    return new MockTextLine(line, text);
  }

  get lineCount(): number {
    return this.lines.length;
  }
}

/**
 * MockWorkspaceFolderクラス
 */
export interface MockWorkspaceFolder {
  uri: Uri;
  name: string;
  index: number;
}

/**
 * vscode.tests名前空間のモック
 */
export const tests = {
  createTestController: vi.fn((id: string, label: string) => new MockTestController(id, label)),
};

/**
 * vscode.workspace名前空間のモック
 */
export const workspace = {
  findFiles: vi.fn().mockResolvedValue([]),
  openTextDocument: vi.fn().mockImplementation((uri: Uri) => {
    return Promise.resolve(new MockTextDocument(uri, ''));
  }),
  getWorkspaceFolder: vi.fn().mockReturnValue(undefined),
  asRelativePath: vi.fn((uri: Uri) => uri.fsPath),
  createFileSystemWatcher: vi.fn(() => ({
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  })),
};

/**
 * vscode.window名前空間のモック
 */
export const window = {
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
};

/**
 * vscode.extensions名前空間のモック
 */
export const extensions = {
  getExtension: vi.fn().mockReturnValue(undefined),
};

/**
 * 型エクスポート
 */
export type TestController = MockTestController;
export type TestItem = MockTestItem;
export type TestItemCollection = MockTestItemCollection;
export type TestRun = MockTestRun;
export type CancellationToken = MockCancellationToken;
export type TextDocument = MockTextDocument;
export type TextLine = MockTextLine;
export type WorkspaceFolder = MockWorkspaceFolder;
export type ExtensionContext = {
  subscriptions: Array<{ dispose: () => void }>;
};
