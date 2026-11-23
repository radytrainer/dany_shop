#!/bin/sh
# Creates a compressed PostgreSQL dump (custom format) and an archive of uploaded images,
# then deletes backups older than BACKUP_KEEP_DAYS. Uses PG* environment variables.
set -eu

DEST=/backups
KEEP=${BACKUP_KEEP_DAYS:-14}
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"

DB_FILE="$DEST/db-$STAMP.dump"
pg_dump --format=custom --compress=9 --no-owner --file="$DB_FILE.partial"
mv "$DB_FILE.partial" "$DB_FILE"
echo "[backup] database → $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

if [ -d /uploads ] && [ "$(ls -A /uploads 2>/dev/null)" ]; then
  UP_FILE="$DEST/uploads-$STAMP.tar.gz"
  tar -czf "$UP_FILE.partial" -C /uploads .
  mv "$UP_FILE.partial" "$UP_FILE"
  echo "[backup] uploads  → $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"
fi

find "$DEST" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP" -print -delete
echo "[backup] done $(date -Iseconds)"
