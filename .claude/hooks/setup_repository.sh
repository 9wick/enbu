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

pnpm install
pnpm agent-browser install --with-deps