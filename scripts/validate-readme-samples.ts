#!/usr/bin/env node
/**
 * README記載のYAMLサンプルのschemaバリデーションスクリプト
 *
 * README.mdとREADME-ja.mdに記載されているYAMLコードブロックを抽出し、
 * schemaバリデーションを行う。全てのサンプルをチェックして結果を報告する。
 *
 * 使用方法:
 *   pnpm run validate-readme-samples
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * READMEファイルからYAMLコードブロックを抽出する
 *
 * @param content - READMEファイルの内容
 * @returns 抽出されたYAMLコードブロックの配列（行番号と内容を含む）
 */
const extractYamlBlocks = (content: string): Array<{ line: number; yaml: string }> => {
  const blocks: Array<{ line: number; yaml: string }> = [];
  const lines = content.split('\n');

  let inYamlBlock = false;
  let currentBlock: string[] = [];
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // YAMLコードブロックの開始を検出
    if (line.trim().startsWith('```yaml') || line.trim().startsWith('```yml')) {
      inYamlBlock = true;
      blockStartLine = i + 1; // 1始まりの行番号
      currentBlock = [];
      continue;
    }

    // コードブロックの終了を検出
    if (inYamlBlock && line.trim() === '```') {
      inYamlBlock = false;
      if (currentBlock.length > 0) {
        blocks.push({
          line: blockStartLine,
          yaml: currentBlock.join('\n'),
        });
      }
      currentBlock = [];
      continue;
    }

    // YAMLブロック内の行を追加
    if (inYamlBlock) {
      currentBlock.push(line);
    }
  }

  return blocks;
};

/**
 * YAML文字列が有効なフロー形式かどうかを簡易チェックする
 *
 * @param yaml - YAML文字列
 * @returns 有効なフロー形式の場合true
 */
const isValidFlowFormat = (yaml: string): boolean => {
  const trimmed = yaml.trim();
  // 空でないことを確認
  if (trimmed.length === 0) {
    return false;
  }
  // stepsキーが含まれていることを確認
  if (!trimmed.includes('steps:')) {
    return false;
  }
  // GitHub Actions等の他のYAML形式を除外
  // on:, jobs: などのGitHub Actionsキーワードを含む場合は除外
  if (trimmed.includes('on:') || trimmed.includes('jobs:')) {
    return false;
  }
  return true;
};

/**
 * メイン処理
 */
const main = async () => {
  const readmes = ['README.md', 'README-ja.md'];
  const results: Array<{
    file: string;
    blocks: number;
    valid: number;
    invalid: number;
    skipped: number;
    errors: Array<{ line: number; error: string; yaml: string }>;
  }> = [];

  for (const readmeFile of readmes) {
    const readmePath = join(ROOT_DIR, readmeFile);
    const readmeContent = await readFile(readmePath, 'utf-8');

    const yamlBlocks = extractYamlBlocks(readmeContent);

    let validCount = 0;
    let invalidCount = 0;
    let skippedCount = 0;
    const errors: Array<{ line: number; error: string; yaml: string }> = [];

    for (const block of yamlBlocks) {
      // フロー形式でないものはスキップ
      if (!isValidFlowFormat(block.yaml)) {
        skippedCount++;
        continue;
      }

      try {
        // TypeScriptの型チェックを回避するために動的インポートを使用
        const { parseFlowYaml } = await import(
          join(ROOT_DIR, 'packages/core/src/parser/yaml-parser.ts')
        );

        const result = parseFlowYaml(block.yaml, 'readme-sample.enbu.yaml', {}, {});

        if (result.isErr()) {
          invalidCount++;
          errors.push({
            line: block.line,
            error: result.error.message,
            yaml: block.yaml,
          });
        } else {
          validCount++;
        }
      } catch (error) {
        invalidCount++;
        errors.push({
          line: block.line,
          error: error instanceof Error ? error.message : String(error),
          yaml: block.yaml,
        });
      }
    }

    results.push({
      file: readmeFile,
      blocks: yamlBlocks.length,
      valid: validCount,
      invalid: invalidCount,
      skipped: skippedCount,
      errors,
    });
  }

  // 結果を出力
  let totalBlocks = 0;
  let totalValid = 0;
  let totalInvalid = 0;
  let totalSkipped = 0;

  console.log('README YAMLサンプルのバリデーション結果\n');

  for (const result of results) {
    totalBlocks += result.blocks;
    totalValid += result.valid;
    totalInvalid += result.invalid;
    totalSkipped += result.skipped;

    console.log(`${result.file}:`);
    console.log(`  全コードブロック: ${result.blocks}`);
    console.log(`  バリデーション済み: ${result.valid + result.invalid}`);
    console.log(`  ✓ 有効: ${result.valid}`);
    console.log(`  ✗ 無効: ${result.invalid}`);
    console.log(`  - スキップ（非フロー形式）: ${result.skipped}`);

    if (result.errors.length > 0) {
      console.log('\n  エラー詳細:');
      for (const error of result.errors) {
        console.log(`\n  行 ${error.line}:`);
        console.log(`  エラー: ${error.error}`);
        console.log(`  YAML:`);
        console.log('  ' + error.yaml.split('\n').join('\n  '));
      }
    }
    console.log('');
  }

  console.log(`合計:`);
  console.log(`  全コードブロック: ${totalBlocks}`);
  console.log(`  バリデーション済み: ${totalValid + totalInvalid}`);
  console.log(`  ✓ 有効: ${totalValid}`);
  console.log(`  ✗ 無効: ${totalInvalid}`);
  console.log(`  - スキップ（非フロー形式）: ${totalSkipped}`);

  if (totalInvalid > 0) {
    console.log(`\n${totalInvalid}個のサンプルでエラーが見つかりました。`);
    process.exit(1);
  } else {
    console.log('\n全てのサンプルが有効です。');
    process.exit(0);
  }
};

main().catch((error) => {
  console.error('スクリプトの実行中にエラーが発生しました:', error);
  process.exit(1);
});
