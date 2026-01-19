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


# playwright (agent-browserと同じバージョン) をdevDependenciesに追加済みなので、
# pnpm exec playwright でローカルのplaywrightが実行される
pnpm exec playwright install --with-deps chromium
