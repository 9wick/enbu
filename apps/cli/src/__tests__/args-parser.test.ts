import { describe, it, expect } from 'vitest';
import { parseArgs } from '../args-parser';

describe('parseArgs', () => {
  /**
   * A-1: --helpフラグが指定された場合
   *
   * 前提条件: argv = ['--help']
   * 検証項目: { command: 'run', help: true } が返される
   */
  it('A-1: --helpフラグが指定された場合、helpフラグをtrueに設定', () => {
    // Arrange
    const argv = ['--help'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        expect(parsed.help).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-2: initコマンドが指定された場合
   *
   * 前提条件: argv = ['init']
   * 検証項目: { command: 'init', force: false } が返される
   */
  it('A-2: initコマンドをパースできる', () => {
    // Arrange
    const argv = ['init'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('init');
        if (parsed.command === 'init') {
          expect(parsed.force).toBe(false);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-3: init --forceが指定された場合
   *
   * 前提条件: argv = ['init', '--force']
   * 検証項目: { command: 'init', force: true } が返される
   */
  it('A-3: init --forceをパースできる', () => {
    // Arrange
    const argv = ['init', '--force'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('init');
        if (parsed.command === 'init') {
          expect(parsed.force).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-4: runコマンド（デフォルト、引数なし）
   *
   * 前提条件: argv = []
   * 検証項目: { command: 'run', files: [] } が返される
   */
  it('A-4: 引数なしの場合、runコマンドとして扱う', () => {
    // Arrange
    const argv: string[] = [];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        if (parsed.command === 'run') {
          expect(parsed.files).toEqual([]);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-5: runコマンド（ファイル指定）
   *
   * 前提条件: argv = ['login.flow.yaml']
   * 検証項目: { command: 'run', files: ['login.flow.yaml'] } が返される
   */
  it('A-5: フローファイルを指定できる', () => {
    // Arrange
    const argv = ['login.flow.yaml'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        if (parsed.command === 'run') {
          expect(parsed.files).toEqual(['login.flow.yaml']);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-6: --headedオプション
   *
   * 前提条件: argv = ['--headed', 'login.flow.yaml']
   * 検証項目: { headed: true } が返される
   */
  it('A-6: --headedオプションをパースできる', () => {
    // Arrange
    const argv = ['--headed', 'login.flow.yaml'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.headed).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-7: --env KEY=VALUEオプション
   *
   * 前提条件: argv = ['--env', 'USER=test']
   * 検証項目: { env: { USER: 'test' } } が返される
   */
  it('A-7: --envオプションをパースできる', () => {
    // Arrange
    const argv = ['--env', 'USER=test'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.env).toEqual({ USER: 'test' });
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-8: --env 複数指定
   *
   * 前提条件: argv = ['--env', 'USER=test', '--env', 'PASSWORD=secret']
   * 検証項目: { env: { USER: 'test', PASSWORD: 'secret' } } が返される
   */
  it('A-8: --envを複数回指定できる', () => {
    // Arrange
    const argv = ['--env', 'USER=test', '--env', 'PASSWORD=secret'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.env).toEqual({ USER: 'test', PASSWORD: 'secret' });
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-9: --timeout <ms>オプション
   *
   * 前提条件: argv = ['--timeout', '60000']
   * 検証項目: { timeout: 60000 } が返される
   */
  it('A-9: --timeoutオプションをパースできる', () => {
    // Arrange
    const argv = ['--timeout', '60000'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.timeout).toBe(60000);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-10: --timeout 無効な値
   *
   * 前提条件: argv = ['--timeout', 'invalid']
   * 検証項目: err({ type: 'invalid_args' }) が返される
   */
  it('A-10: --timeoutに無効な値が指定された場合、エラーを返す', () => {
    // Arrange
    const argv = ['--timeout', 'invalid'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_args');
        expect(error.message).toContain('positive number');
      },
    );
  });

  /**
   * A-11: --screenshotオプション
   *
   * 前提条件: argv = ['--screenshot']
   * 検証項目: { screenshot: true } が返される
   */
  it('A-11: --screenshotオプションをパースできる', () => {
    // Arrange
    const argv = ['--screenshot'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.screenshot).toBe(true);
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-12: --bailオプション
   *
   * 前提条件: argv = ['--bail']
   * 検証項目: { bail: true } が返される
   */
  it('A-12: --bailオプションをパースできる', () => {
    // Arrange
    const argv = ['--bail'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.bail).toBe(true);
        }
      },
      () => {
        throw new Error('Expected err result');
      },
    );
  });

  /**
   * A-13: --session <name>オプション
   *
   * 前提条件: argv = ['--session', 'my-session']
   * 検証項目: { session: 'my-session' } が返される
   */
  it('A-13: --sessionオプションをパースできる', () => {
    // Arrange
    const argv = ['--session', 'my-session'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        if (parsed.command === 'run') {
          expect(parsed.session).toBe('my-session');
        }
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-14: --verbose / -v オプション
   *
   * 前提条件: argv = ['-v']
   * 検証項目: { verbose: true } が返される
   */
  it('A-14: -vオプションでverboseモードを有効化', () => {
    // Arrange
    const argv = ['-v'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.verbose).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-14-1: --versionフラグが指定された場合
   *
   * 前提条件: argv = ['--version']
   * 検証項目: { command: 'run', version: true } が返される
   */
  it('A-14-1: --versionフラグが指定された場合、versionフラグをtrueに設定', () => {
    // Arrange
    const argv = ['--version'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        expect(parsed.version).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-14-2: -Vフラグが指定された場合
   *
   * 前提条件: argv = ['-V']
   * 検証項目: { command: 'run', version: true } が返される
   */
  it('A-14-2: -Vフラグが指定された場合、versionフラグをtrueに設定', () => {
    // Arrange
    const argv = ['-V'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      (parsed) => {
        expect(parsed.command).toBe('run');
        expect(parsed.version).toBe(true);
      },
      () => {
        throw new Error('Expected ok result');
      },
    );
  });

  /**
   * A-15: 未知のオプション
   *
   * 前提条件: argv = ['--unknown']
   * 検証項目: err({ type: 'invalid_args' }) が返される
   */
  it('A-15: 未知のオプションが指定された場合、エラーを返す', () => {
    // Arrange
    const argv = ['--unknown'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_args');
        expect(error.message).toContain('Unknown option');
      },
    );
  });

  /**
   * A-16: --env 不正な形式
   *
   * 前提条件: argv = ['--env', 'INVALID']
   * 検証項目: err({ type: 'invalid_args' }) が返される
   */
  it('A-16: --envに=がない場合、エラーを返す', () => {
    // Arrange
    const argv = ['--env', 'INVALID'];

    // Act
    const result = parseArgs(argv);

    // Assert
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected err result');
      },
      (error) => {
        expect(error.type).toBe('invalid_args');
        expect(error.message).toContain('KEY=VALUE format');
      },
    );
  });
});
