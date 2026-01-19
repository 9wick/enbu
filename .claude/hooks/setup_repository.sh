#!/bin/bash
set -e

LOG_PREFIX="[setup-repository]"

log() {
    echo "$LOG_PREFIX $1" >&2
}


if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
    log "Not a remote session, skipping repository setup"
    exit 0
fi

log "Remote session detected, setup repository..."

pnpm install --frozen-lockfile


# agent-browserが依存するplaywright-coreでブラウザをインストールする
# 注意: pnpm exec playwright はグローバルの playwright を実行してしまい、バージョン不一致が発生する
# そのため、agent-browserの依存として含まれるplaywright-coreを直接実行する
PLAYWRIGHT_CORE_CLI=$(ls node_modules/.pnpm/agent-browser@*/node_modules/playwright-core/cli.js 2>/dev/null | head -1)
if [ -z "$PLAYWRIGHT_CORE_CLI" ]; then
    log "Error: playwright-core not found in agent-browser dependencies"
    exit 1
fi
log "Using playwright-core: $PLAYWRIGHT_CORE_CLI"
node "$PLAYWRIGHT_CORE_CLI" install --with-deps chromium
