/**
 * @packages/agent-browser-adapter
 *
 * agent-browser CLI との通信層を提供する。
 */

// 関数
export { checkAgentBrowser } from './check';
export { executeCommand } from './executor';
export { parseJsonOutput, parseSnapshotRefs } from './parser';

// 型
export type {
  AgentBrowserError,
  AgentBrowserJsonOutput,
  ExecuteOptions,
  SnapshotRef,
  SnapshotRefs,
} from './types';
