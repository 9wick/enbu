/**
 * 待機系コマンドハンドラ
 *
 * waitコマンドの各バリアントを処理する。
 */

import type { AgentBrowserError, ExecuteOptions } from '@packages/agent-browser-adapter';
import {
  asCliXpathSelector,
  browserWaitForFunction,
  browserWaitForLoad,
  browserWaitForMs,
  browserWaitForSelector,
  browserWaitForText,
  browserWaitForUrl,
} from '@packages/agent-browser-adapter';
import { errAsync, type ResultAsync } from 'neverthrow';
import { P, match } from 'ts-pattern';
import type { WaitCommand } from '../../types';
import type { CommandResult, ExecutionContext } from '../result';

/**
 * 出力をCommandResultに変換するヘルパー関数を生成する
 *
 * @param startTime - コマンド実行開始時刻（ミリ秒）
 * @returns CommandResult変換関数
 */
const createResultMapper =
  (startTime: number) =>
  <T>(output: T): CommandResult => ({
    stdout: JSON.stringify(output),
    duration: Date.now() - startTime,
  });

/**
 * wait コマンドのハンドラ
 *
 * agent-browserのwaitコマンドと1:1対応:
 * - ms: 指定ミリ秒待機 (wait <ms>)
 * - css: CSSセレクタで要素出現を待つ (wait <selector>)
 * - text: テキスト出現を待つ (wait --text <text>)
 * - xpath: XPathセレクタで要素出現を待つ (wait <selector>)
 * - load: ロード状態を待つ (wait --load <state>)
 * - url: URL変化を待つ (wait --url <pattern>)
 * - fn: JS式がtruthyになるのを待つ (wait --fn <expression>)
 *
 * ts-patternでパターンマッチし、型安全にルーティングする。
 *
 * @param command - wait コマンドのパラメータ
 * @param context - 実行コンテキスト
 * @returns コマンド実行結果を含むResult型
 */
export const handleWait = (
  command: WaitCommand,
  context: ExecutionContext,
): ResultAsync<CommandResult, AgentBrowserError> => {
  const toResult = createResultMapper(Date.now());
  const options: ExecuteOptions = context.executeOptions;

  return match(command)
    .with({ ms: P.number }, (cmd) => browserWaitForMs(cmd.ms, options).map(toResult))
    .with({ css: P.string }, (cmd) => browserWaitForSelector(cmd.css, options).map(toResult))
    .with({ anyText: P.string }, (cmd) => browserWaitForText(cmd.anyText, options).map(toResult))
    .with({ xpath: P.string }, (cmd) =>
      asCliXpathSelector(`xpath=${cmd.xpath}`).match(
        (cliXpathSelector) => browserWaitForSelector(cliXpathSelector, options).map(toResult),
        (error) => errAsync(error),
      ),
    )
    .with({ load: P.string }, (cmd) => browserWaitForLoad(cmd.load, options).map(toResult))
    .with({ url: P.string }, (cmd) => browserWaitForUrl(cmd.url, options).map(toResult))
    .with({ fn: P.string }, (cmd) => browserWaitForFunction(cmd.fn, options).map(toResult))
    .exhaustive();
};
