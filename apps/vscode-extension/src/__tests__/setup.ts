/**
 * E2Eテスト用セットアップ
 *
 * テスト実行前にnode_modules/.bin/enbuへのシンボリックリンクを作成する。
 * モノレポ環境でapps/cli/dist/main.mjsを直接実行できるようにする。
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
// apps/vscode-extension/src/__tests__ -> モノレポルート
const monorepoRoot = resolve(currentDir, '../../../..');
const nodeModulesBin = resolve(monorepoRoot, 'node_modules', '.bin');
const enbuBinPath = resolve(nodeModulesBin, 'enbu');
const cliMainPath = resolve(monorepoRoot, 'apps', 'cli', 'dist', 'main.mjs');

// node_modules/.binディレクトリが存在しない場合は作成
if (!existsSync(nodeModulesBin)) {
  mkdirSync(nodeModulesBin, { recursive: true });
}

// 既存のenbuリンク/ファイルがあれば削除
if (existsSync(enbuBinPath)) {
  unlinkSync(enbuBinPath);
}

// シェルスクリプトを作成（macOS/Linux用）
// 直接シンボリックリンクではなく、nodeで実行するラッパースクリプトを作成
const shellScript = `#!/usr/bin/env node
import('${cliMainPath}');
`;

writeFileSync(enbuBinPath, shellScript, { mode: 0o755 });

console.log(`[setup] Created enbu binary wrapper at ${enbuBinPath}`);
