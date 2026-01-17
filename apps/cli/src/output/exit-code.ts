/**
 * 終了コード定義
 */
export const EXIT_CODE = {
  /** 成功 */
  SUCCESS: 0,
  /** フロー実行失敗 */
  FLOW_FAILED: 1,
  /** 実行エラー(agent-browser未インストール等) */
  EXECUTION_ERROR: 2,
} as const;

/**
 * 終了コードで終了する
 *
 * @param code - 終了コード
 */
export const exitWithCode = (code: number): never => {
  process.exit(code);
};
