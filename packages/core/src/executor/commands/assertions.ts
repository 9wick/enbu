import { ok, err } from 'neverthrow';
import type { Result } from 'neverthrow';
import { executeCommand, parseJsonOutput } from '@packages/agent-browser-adapter';
import type { AgentBrowserError } from '@packages/agent-browser-adapter';
import type { AssertVisibleCommand, AssertEnabledCommand, AssertCheckedCommand } from '../../types';
import type { ExecutionContext, CommandResult } from '../result';

/**
 * assertVisible コマンドのハンドラ
 *
 * 指定されたセレクタの要素が表示されていることを確認する。
 * agent-browser の is visible コマンドを実行し、その結果を検証する。
 * 要素が表示されていない場合は assertion_failed エラーを返す。
 *
 * @param command - assertVisible コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertVisible = async (
  command: AssertVisibleCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (
    await executeCommand('is', ['visible', command.selector, '--json'], context.executeOptions)
  )
    .andThen(parseJsonOutput)
    .andThen((output) => {
      const duration = Date.now() - startTime;

      // output.data は unknown 型なので型ガードで絞り込む
      const data = output.data;
      const hasVisibleField = (d: unknown): d is Record<'visible', unknown> =>
        d !== null && typeof d === 'object' && 'visible' in d;
      const isVisibleData = (d: unknown): d is { visible: boolean } =>
        hasVisibleField(d) && typeof d.visible === 'boolean';
      const visibleData = isVisibleData(data) ? data : null;

      if (!output.success || !visibleData || !visibleData.visible) {
        const error: AgentBrowserError = {
          type: 'assertion_failed',
          message: `Element "${command.selector}" is not visible`,
          command: 'is',
          args: ['visible', command.selector],
          exitCode: 1,
          stderr: '',
          errorMessage: output.error,
        };
        return err(error);
      }

      return ok({
        stdout: JSON.stringify(output),
        duration,
      });
    });
};

/**
 * assertEnabled コマンドのハンドラ
 *
 * 指定されたセレクタの要素が有効化されていることを確認する。
 * agent-browser の is enabled コマンドを実行し、その結果を検証する。
 * 要素が有効化されていない場合は assertion_failed エラーを返す。
 *
 * @param command - assertEnabled コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertEnabled = async (
  command: AssertEnabledCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (
    await executeCommand('is', ['enabled', command.selector, '--json'], context.executeOptions)
  )
    .andThen(parseJsonOutput)
    .andThen((output) => {
      const duration = Date.now() - startTime;

      // output.data は unknown 型なので型ガードで絞り込む
      const data = output.data;
      const hasEnabledField = (d: unknown): d is Record<'enabled', unknown> =>
        d !== null && typeof d === 'object' && 'enabled' in d;
      const isEnabledData = (d: unknown): d is { enabled: boolean } =>
        hasEnabledField(d) && typeof d.enabled === 'boolean';
      const enabledData = isEnabledData(data) ? data : null;

      if (!output.success || !enabledData || !enabledData.enabled) {
        const error: AgentBrowserError = {
          type: 'assertion_failed',
          message: `Element "${command.selector}" is not enabled`,
          command: 'is',
          args: ['enabled', command.selector],
          exitCode: 1,
          stderr: '',
          errorMessage: output.error,
        };
        return err(error);
      }

      return ok({
        stdout: JSON.stringify(output),
        duration,
      });
    });
};

/**
 * assertChecked コマンドのハンドラ
 *
 * 指定されたセレクタのチェックボックスがチェックされているか、または指定された状態であることを確認する。
 * agent-browser の is checked コマンドを実行し、その結果を検証する。
 * 期待値と実際の状態が一致しない場合は assertion_failed エラーを返す。
 *
 * @param command - assertChecked コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleAssertChecked = async (
  command: AssertCheckedCommand,
  context: ExecutionContext,
): Promise<Result<CommandResult, AgentBrowserError>> => {
  const startTime = Date.now();

  return (
    await executeCommand('is', ['checked', command.selector, '--json'], context.executeOptions)
  )
    .andThen(parseJsonOutput)
    .andThen((output) => {
      const duration = Date.now() - startTime;

      // checkedの期待値とマッチするか確認
      const expectedChecked = command.checked ?? true; // デフォルトはtrue

      // output.data は unknown 型なので型ガードで絞り込む
      const data = output.data;
      const hasCheckedField = (d: unknown): d is Record<'checked', unknown> =>
        d !== null && typeof d === 'object' && 'checked' in d;
      const isCheckedData = (d: unknown): d is { checked: boolean } =>
        hasCheckedField(d) && typeof d.checked === 'boolean';
      const checkedData = isCheckedData(data) ? data : null;
      const actualChecked = checkedData?.checked;

      if (!output.success || actualChecked !== expectedChecked) {
        const error: AgentBrowserError = {
          type: 'assertion_failed',
          message: `Element "${command.selector}" checked state is ${actualChecked}, expected ${expectedChecked}`,
          command: 'is',
          args: ['checked', command.selector],
          exitCode: 1,
          stderr: '',
          errorMessage: output.error,
        };
        return err(error);
      }

      return ok({
        stdout: JSON.stringify(output),
        duration,
      });
    });
};
