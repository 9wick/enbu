/**
 * agent-browser-flow CLI エントリーポイント
 */

/**
 * 標準出力への書き込み
 * CLIでの出力用。no-consoleルールの代替として使用する。
 * @param message 出力するメッセージ
 */
function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

/**
 * メイン関数
 * CLIの起動処理を行う
 */
function main(): void {
  print('agent-browser-flow CLI started');
}

main();
