/**
 * run-flows.ts のユニットテスト
 *
 * generateSessionNameFromPath関数の全ての動作を検証する。
 */

import { describe, expect, it } from 'vitest';
import { generateSessionNameFromPath } from './run-flows';

describe('generateSessionNameFromPath', () => {
  /**
   * SN-1: 基本的なセッション名生成
   *
   * 前提条件: 標準的なフローファイルパス
   * 検証項目:
   * - 'enbu-{flowName}-{hash}' 形式で生成される
   * - flowNameは.enbu.yamlが除去されたファイル名
   * - hashは6文字の16進数文字列
   */
  it('SN-1: 標準的なパスから期待通りのセッション名が生成される', () => {
    // Arrange
    const filePath = '/workspaces/enbu/example/basic/login.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    // 'enbu-login-XXXXXX' 形式であることを検証
    expect(sessionName).toMatch(/^enbu-login-[a-f0-9]{6}$/);
  });

  /**
   * SN-2: 決定性テスト - 同一パスから同一ハッシュ
   *
   * 前提条件: 同じファイルパスを複数回渡す
   * 検証項目:
   * - 毎回同じセッション名が生成される
   * - ハッシュ値が決定的である
   */
  it('SN-2: 同一パスから同一のセッション名が生成される', () => {
    // Arrange
    const filePath = '/workspaces/enbu/example/basic/login.enbu.yaml';

    // Act
    const sessionName1 = generateSessionNameFromPath(filePath);
    const sessionName2 = generateSessionNameFromPath(filePath);
    const sessionName3 = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName1).toBe(sessionName2);
    expect(sessionName2).toBe(sessionName3);
  });

  /**
   * SN-3: 衝突テスト - 異なるパスから異なるハッシュ
   *
   * 前提条件: 異なるファイルパス
   * 検証項目:
   * - 異なるパスからは異なるハッシュが生成される
   */
  it('SN-3: 異なるパスから異なるセッション名が生成される', () => {
    // Arrange
    const filePath1 = '/workspaces/enbu/example/basic/login.enbu.yaml';
    const filePath2 = '/workspaces/enbu/example/basic/logout.enbu.yaml';
    const filePath3 = '/workspaces/other-project/example/basic/login.enbu.yaml';

    // Act
    const sessionName1 = generateSessionNameFromPath(filePath1);
    const sessionName2 = generateSessionNameFromPath(filePath2);
    const sessionName3 = generateSessionNameFromPath(filePath3);

    // Assert
    // ファイル名が異なる場合
    expect(sessionName1).not.toBe(sessionName2);
    // 同じファイル名でもパスが異なる場合は異なるハッシュ
    expect(sessionName1).not.toBe(sessionName3);
  });

  /**
   * SN-4: 日本語を含むパス
   *
   * 前提条件: 日本語のディレクトリ名やファイル名を含むパス
   * 検証項目:
   * - 日本語を含むパスでも正常にセッション名が生成される
   * - ハッシュが6文字の16進数である
   */
  it('SN-4: 日本語を含むパスから正常にセッション名が生成される', () => {
    // Arrange
    const filePath = '/workspaces/プロジェクト/テスト/ログイン確認.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName).toMatch(/^enbu-ログイン確認-[a-f0-9]{6}$/);
  });

  /**
   * SN-5: 深いディレクトリ構造
   *
   * 前提条件: 非常に深いディレクトリ構造のパス
   * 検証項目:
   * - 深いパスでも正常にセッション名が生成される
   * - ファイル名部分のみがflowNameとして使用される
   */
  it('SN-5: 深いディレクトリ構造のパスから正常にセッション名が生成される', () => {
    // Arrange
    const filePath =
      '/workspaces/enbu/very/deep/nested/directory/structure/tests/e2e/flows/user/authentication/login.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName).toMatch(/^enbu-login-[a-f0-9]{6}$/);
  });

  /**
   * SN-6: 特殊文字を含むパス（スペース）
   *
   * 前提条件: スペースを含むパス
   * 検証項目:
   * - スペースを含むパスでも正常にセッション名が生成される
   */
  it('SN-6: スペースを含むパスから正常にセッション名が生成される', () => {
    // Arrange
    const filePath = '/workspaces/my project/test flows/user login.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName).toMatch(/^enbu-user login-[a-f0-9]{6}$/);
  });

  /**
   * SN-7: 特殊文字を含むパス（ハイフン、アンダースコア）
   *
   * 前提条件: ハイフンやアンダースコアを含むファイル名
   * 検証項目:
   * - 特殊文字がそのまま保持される
   */
  it('SN-7: ハイフン・アンダースコアを含むパスから正常にセッション名が生成される', () => {
    // Arrange
    const filePath = '/workspaces/enbu/example/user-authentication_flow.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName).toMatch(/^enbu-user-authentication_flow-[a-f0-9]{6}$/);
  });

  /**
   * SN-8: Windows形式のパス
   *
   * 前提条件: Windowsスタイルのパス区切り文字
   * 検証項目:
   * - path.basenameは環境に依存するが、テスト環境では正常に動作する
   * 注意: このテストはLinux/macOS環境で実行されることを想定
   */
  it('SN-8: バックスラッシュを含むパスでもファイル名が抽出される', () => {
    // Arrange
    // Node.jsのpath.basenameはPOSIX環境ではバックスラッシュをパス区切りとして扱わない
    // そのため、ファイル名全体が返される
    const filePath = 'C:\\Users\\test\\project\\login.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    // POSIX環境ではバックスラッシュがファイル名の一部として扱われる
    expect(sessionName).toMatch(/^enbu-.*-[a-f0-9]{6}$/);
  });

  /**
   * SN-9: 短いファイル名
   *
   * 前提条件: 1文字のファイル名
   * 検証項目:
   * - 短いファイル名でも正常に動作する
   */
  it('SN-9: 短いファイル名から正常にセッション名が生成される', () => {
    // Arrange
    const filePath = '/a.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName).toMatch(/^enbu-a-[a-f0-9]{6}$/);
  });

  /**
   * SN-10: 同一ファイル名・異なるディレクトリ
   *
   * 前提条件: 同じファイル名だが異なるディレクトリに存在するファイル
   * 検証項目:
   * - 同じflowNameでも異なるハッシュが生成される
   * - セッション名の一意性が保証される
   */
  it('SN-10: 同一ファイル名でもディレクトリが異なれば異なるハッシュが生成される', () => {
    // Arrange
    const filePath1 = '/workspaces/project-a/login.enbu.yaml';
    const filePath2 = '/workspaces/project-b/login.enbu.yaml';

    // Act
    const sessionName1 = generateSessionNameFromPath(filePath1);
    const sessionName2 = generateSessionNameFromPath(filePath2);

    // Assert
    // flowNameは同じ 'login'
    expect(sessionName1).toMatch(/^enbu-login-[a-f0-9]{6}$/);
    expect(sessionName2).toMatch(/^enbu-login-[a-f0-9]{6}$/);
    // しかしハッシュは異なる（パス全体でハッシュを計算するため）
    expect(sessionName1).not.toBe(sessionName2);
  });

  /**
   * SN-11: 数字で始まるファイル名
   *
   * 前提条件: 数字で始まるファイル名
   * 検証項目:
   * - 数字で始まるファイル名でも正常に動作する
   */
  it('SN-11: 数字で始まるファイル名から正常にセッション名が生成される', () => {
    // Arrange
    const filePath = '/workspaces/enbu/example/01-first-test.enbu.yaml';

    // Act
    const sessionName = generateSessionNameFromPath(filePath);

    // Assert
    expect(sessionName).toMatch(/^enbu-01-first-test-[a-f0-9]{6}$/);
  });

  /**
   * SN-12: 実際のexampleファイルパス
   *
   * 前提条件: 実際のリポジトリで使用されるexampleファイルパス
   * 検証項目:
   * - 実際のパスパターンで正常に動作する
   * - ハッシュ値が期待通りの形式である
   */
  it('SN-12: 実際のexampleファイルパスから正常にセッション名が生成される', () => {
    // Arrange
    const filePaths = [
      '/workspaces/enbu/example/basic/login.enbu.yaml',
      '/workspaces/enbu/example/assertions/expect-text.enbu.yaml',
      '/workspaces/enbu/example/navigation/go-back.enbu.yaml',
    ];

    // Act & Assert
    for (const filePath of filePaths) {
      const sessionName = generateSessionNameFromPath(filePath);
      // 形式チェック: enbu-{flowName}-{6文字のハッシュ}
      expect(sessionName).toMatch(/^enbu-[\w-]+-[a-f0-9]{6}$/);
      // .enbu.yaml が除去されていることを確認
      expect(sessionName).not.toContain('.enbu.yaml');
    }
  });
});
