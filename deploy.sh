#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="main"

DO_PULL=1
DEPLOY_FRONTEND=1
DEPLOY_BACKEND=1
RUN_INSTALL=1
RUN_BUILD=1
RUN_HEALTH_CHECK=1

FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-ilena-frontend}"
BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-ilena-backend}"
PUBLIC_URL="${PUBLIC_URL:-https://ilenafurniture.net}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-$PUBLIC_URL/api/health}"

STATE_DIR="$ROOT_DIR/.deploy"
LAST_SUCCESS_FILE="$STATE_DIR/last_successful_commit"

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [options]

Options:
  --branch <name>        Git branch to deploy (default: main)
  --frontend-only        Deploy frontend only
  --backend-only         Deploy backend only
  --no-pull              Skip git fetch/pull
  --skip-install         Skip npm ci
  --skip-build           Skip frontend build
  --skip-health-check    Skip health checks
  -h, --help             Show this help
USAGE
}

log() {
  printf '[deploy] %s\n' "$*"
}

die() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      [[ $# -ge 2 ]] || die "--branch requires a value"
      BRANCH="$2"
      shift 2
      ;;
    --frontend-only)
      DEPLOY_FRONTEND=1
      DEPLOY_BACKEND=0
      shift
      ;;
    --backend-only)
      DEPLOY_FRONTEND=0
      DEPLOY_BACKEND=1
      shift
      ;;
    --no-pull)
      DO_PULL=0
      shift
      ;;
    --skip-install)
      RUN_INSTALL=0
      shift
      ;;
    --skip-build)
      RUN_BUILD=0
      shift
      ;;
    --skip-health-check)
      RUN_HEALTH_CHECK=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

[[ $DEPLOY_FRONTEND -eq 1 || $DEPLOY_BACKEND -eq 1 ]] || die "Nothing to deploy."
[[ -d "$ROOT_DIR/.git" ]] || die "Not a git repository: $ROOT_DIR"
[[ -d "$ROOT_DIR/frontend" ]] || die "Missing directory: $ROOT_DIR/frontend"
[[ -d "$ROOT_DIR/backend" ]] || die "Missing directory: $ROOT_DIR/backend"

require_cmd git
require_cmd npm
require_cmd pm2
if [[ $RUN_HEALTH_CHECK -eq 1 ]]; then
  require_cmd curl
fi

mkdir -p "$STATE_DIR"

PRE_DEPLOY_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD)"
log "Starting deploy at commit $PRE_DEPLOY_COMMIT"

if [[ $DO_PULL -eq 1 ]]; then
  log "Fetching branch: $BRANCH"
  git -C "$ROOT_DIR" fetch origin "$BRANCH"
  git -C "$ROOT_DIR" checkout "$BRANCH"
  git -C "$ROOT_DIR" pull --ff-only origin "$BRANCH"
fi

TARGET_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD)"
log "Target commit: $TARGET_COMMIT"

if [[ $DEPLOY_FRONTEND -eq 1 ]]; then
  log "Deploying frontend"
  if [[ $RUN_INSTALL -eq 1 ]]; then
    npm --prefix "$ROOT_DIR/frontend" ci
  fi
  if [[ $RUN_BUILD -eq 1 ]]; then
    npm --prefix "$ROOT_DIR/frontend" run build
  fi
  pm2 restart "$FRONTEND_PM2_NAME" --update-env
fi

if [[ $DEPLOY_BACKEND -eq 1 ]]; then
  log "Deploying backend"
  if [[ $RUN_INSTALL -eq 1 ]]; then
    npm --prefix "$ROOT_DIR/backend" ci
  fi
  pm2 restart "$BACKEND_PM2_NAME" --update-env
fi

pm2 save

if [[ $RUN_HEALTH_CHECK -eq 1 ]]; then
  log "Checking backend health: $BACKEND_HEALTH_URL"
  curl -fsS "$BACKEND_HEALTH_URL" >/dev/null

  if [[ $DEPLOY_FRONTEND -eq 1 ]]; then
    log "Checking frontend chunk from: $PUBLIC_URL"
    CSS_PATH="$(curl -fsS "$PUBLIC_URL/" | grep -oE '/_next/static/chunks/[^"]+\.css' | head -1 || true)"
    [[ -n "$CSS_PATH" ]] || die "Could not detect frontend CSS chunk from $PUBLIC_URL"
    curl -fsSI "$PUBLIC_URL$CSS_PATH" >/dev/null
  fi
fi

printf '%s\n' "$TARGET_COMMIT" > "$LAST_SUCCESS_FILE"
log "Deploy success. Saved last successful commit to $LAST_SUCCESS_FILE"
