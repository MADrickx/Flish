#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
INFRA_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$INFRA_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="$BACKUP_DIR/flish-db-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

cd "$INFRA_DIR"

docker compose --env-file .env exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUTPUT_FILE"

echo "Backup created: $OUTPUT_FILE"

