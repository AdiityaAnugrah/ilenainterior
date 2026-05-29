#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
LAST_SUCCESS_FILE="$STATE_DIR/last_successful_commit"

TARGET="${1:-last}"
BRANCH="${BRANCH:-main}"

usage() {
  cat <<'USAGE'
Usage:
  ./rollback.sh last
  ./rollback.sh <commit-sha>

Environment:
  BRANCH=<name>              Branch to return to after rollback (default: main)
  FRONTEND_PM2_NAME=<name>   Default: ilena-frontend
  BACKEND_PM2_NAME=<name>    Default: ilena-backend
USAGE
}

log() {
  printf '[rollback] %s\n' "$*"
}

die() {
  printf '[rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

if [[ "${TARGET:-}" == "-h" || "${TARGET:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_cmd git
require_cmd npm
require_cmd pm2

[[ -d "$ROOT_DIR/.git" ]] || die "Not a git repository: $ROOT_DIR"
[[ -d "$ROOT_DIR/frontend" ]] || die "Missing directory: $ROOT_DIR/frontend"
[[ -d "$ROOT_DIR/backend" ]] || die "Missing directory: $ROOT_DIR/backend"

if [[ "$TARGET" == "last" ]]; then
  [[ -f "$LAST_SUCCESS_FILE" ]] || die "Missing $LAST_SUCCESS_FILE. Run a successful deploy first or pass commit SHA manually."
  TARGET="$(tr -d '[:space:]' < "$LAST_SUCCESS_FILE")"
  [[ -n "$TARGET" ]] || die "Last successful commit file is empty."
fi

if ! git -C "$ROOT_DIR" cat-file -e "${TARGET}^{commit}" 2>/dev/null; then
  log "Commit not found locally, fetching from origin"
  git -C "$ROOT_DIR" fetch --all --tags
  git -C "$ROOT_DIR" cat-file -e "${TARGET}^{commit}" 2>/dev/null || die "Invalid commit: $TARGET"
fi

FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-ilena-frontend}"
BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-ilena-backend}"

CURRENT_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD || true)"
CURRENT_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD)"
log "Current branch: $CURRENT_BRANCH"
log "Current commit: $CURRENT_COMMIT"
log "Rolling back to commit: $TARGET"

git -C "$ROOT_DIR" checkout "$TARGET"

npm --prefix "$ROOT_DIR/frontend" ci
npm --prefix "$ROOT_DIR/frontend" run build
npm --prefix "$ROOT_DIR/backend" ci

pm2 restart "$FRONTEND_PM2_NAME" --update-env
pm2 restart "$BACKEND_PM2_NAME" --update-env
pm2 save

log "Rollback deployed at commit $TARGET"
log "To continue normal deploy flow:"
log "  git -C \"$ROOT_DIR\" checkout \"$BRANCH\""
log "  ./deploy.sh"
