/**
 * CLI実行結果用カスタムマッチャー
 *
 * テスト失敗時にstdout/stderrを含むエラーメッセージを表示する。
 */

import { expect } from 'vitest';
import type { CliResult } from './test-helpers';

/**
 * CLI実行が成功したことを検証するマッチャー
 *
 * 失敗時はstdout/stderrを含むエラーメッセージを表示する。
 */
expect.extend({
  toBeCliSuccess(received: CliResult) {
    const pass = received.exitCode === 0;

    if (pass) {
      return {
        message: () => `expected CLI to fail, but it succeeded`,
        pass: true,
      };
    }

    // 失敗時はstdout/stderrを含める
    return {
      message: () =>
        `CLI failed with exit code ${received.exitCode}\n\n` +
        `--- stdout ---\n${received.stdout || '(empty)'}\n\n` +
        `--- stderr ---\n${received.stderr || '(empty)'}`,
      pass: false,
    };
  },
});

// 型定義を拡張
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeCliSuccess(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeCliSuccess(): any;
  }
}
