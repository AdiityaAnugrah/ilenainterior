#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
LAST_SUCCESS_FILE="$STATE_DIR/last_successful_commit"
PREVIOUS_SUCCESS_FILE="$STATE_DIR/previous_successful_commit"
DEPLOY_IN_PROGRESS_FILE="$STATE_DIR/deploy_in_progress"

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

write_marker() {
  local path="$1"
  local value="$2"
  local temp="${path}.tmp.$$"
  printf '%s\n' "$value" > "$temp"
  mv -f "$temp" "$path"
}

die() {
  printf '[rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${HEALTH_CHECK_ATTEMPTS:-12}"
  local interval="${HEALTH_CHECK_INTERVAL:-5}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl -fsS --connect-timeout 5 --max-time 15 "$url" >/dev/null 2>&1; then
      log "$label succeeded (attempt $attempt/$attempts)"
      return 0
    fi
    if (( attempt < attempts )); then
      log "$label not ready (attempt $attempt/$attempts); retrying in ${interval}s"
      sleep "$interval"
    fi
  done
  return 1
}

require_clean_worktree() {
  local status
  status="$(git -C "$ROOT_DIR" status --porcelain --untracked-files=all)"
  [[ -z "$status" ]] || die "Working tree is not clean; commit or remove local changes before deploy/rollback."
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
require_clean_worktree

if [[ "$TARGET" == "last" ]]; then
  if [[ -f "$DEPLOY_IN_PROGRESS_FILE" ]]; then
    [[ -f "$LAST_SUCCESS_FILE" ]] || die "Interrupted first deploy has no previous successful commit to restore."
    TARGET="$(tr -d '[:space:]' < "$LAST_SUCCESS_FILE")"
    [[ -n "$TARGET" ]] || die "Last successful commit file is empty."
  else
    [[ -f "$PREVIOUS_SUCCESS_FILE" ]] || die "Missing $PREVIOUS_SUCCESS_FILE. Deploy a newer release before rolling back to last."
    TARGET="$(tr -d '[:space:]' < "$PREVIOUS_SUCCESS_FILE")"
    [[ -n "$TARGET" ]] || die "Previous successful commit file is empty."
  fi
fi

if ! git -C "$ROOT_DIR" cat-file -e "${TARGET}^{commit}" 2>/dev/null; then
  log "Commit not found locally, fetching from origin"
  git -C "$ROOT_DIR" fetch --all --tags
  git -C "$ROOT_DIR" cat-file -e "${TARGET}^{commit}" 2>/dev/null || die "Invalid commit: $TARGET"
fi

FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-ilena-frontend}"
BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-ilena-backend}"
PUBLIC_URL="${PUBLIC_URL:-https://ilenafurniture.net}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-$PUBLIC_URL/api/health}"
require_cmd curl

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

log "Checking backend health: $BACKEND_HEALTH_URL"
wait_for_http "$BACKEND_HEALTH_URL" "Backend health" || die "Backend health check failed after ${HEALTH_CHECK_ATTEMPTS:-12} attempts"
log "Checking frontend response: $PUBLIC_URL"
wait_for_http "$PUBLIC_URL/" "Frontend response" || die "Frontend health check failed after ${HEALTH_CHECK_ATTEMPTS:-12} attempts"

if [[ -f "$LAST_SUCCESS_FILE" ]]; then
  PRIOR_SUCCESS="$(tr -d '[:space:]' < "$LAST_SUCCESS_FILE")"
  if [[ -n "$PRIOR_SUCCESS" && "$PRIOR_SUCCESS" != "$TARGET" ]]; then
    write_marker "$PREVIOUS_SUCCESS_FILE" "$PRIOR_SUCCESS"
  fi
fi
write_marker "$LAST_SUCCESS_FILE" "$TARGET"
rm -f "$DEPLOY_IN_PROGRESS_FILE"

log "Rollback deployed at commit $TARGET"
log "To continue normal deploy flow:"
log "  git -C \"$ROOT_DIR\" checkout \"$BRANCH\""
log "  ./deploy.sh"
