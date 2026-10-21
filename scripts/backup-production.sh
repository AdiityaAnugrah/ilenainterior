#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/backend/uploads}"

log() {
  printf '[backup] %s\n' "$*"
}

die() {
  printf '[backup] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || die "Env file not found: $ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"

[[ -n "$DB_NAME" ]] || die "DB_NAME is empty"
[[ -n "$DB_USER" ]] || die "DB_USER is empty"

command -v mysqldump >/dev/null 2>&1 || die "mysqldump not found"
command -v gzip >/dev/null 2>&1 || die "gzip not found"
command -v tar >/dev/null 2>&1 || die "tar not found"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +'%Y%m%d-%H%M%S')"
DB_OUT="$BACKUP_DIR/db-$DB_NAME-$STAMP.sql.gz"
UPLOADS_OUT="$BACKUP_DIR/uploads-$STAMP.tar.gz"

log "Backing up database $DB_NAME to $DB_OUT"
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$DB_OUT"

if [[ -d "$UPLOADS_DIR" ]]; then
  log "Backing up uploads $UPLOADS_DIR to $UPLOADS_OUT"
  tar -C "$(dirname "$UPLOADS_DIR")" -czf "$UPLOADS_OUT" "$(basename "$UPLOADS_DIR")"
else
  log "Uploads directory not found, skipping: $UPLOADS_DIR"
fi

log "Removing backups older than $RETENTION_DAYS days from $BACKUP_DIR"
find "$BACKUP_DIR" -type f \( -name '*.sql.gz' -o -name '*.tar.gz' \) -mtime +"$RETENTION_DAYS" -delete

log "Backup complete"
