#!/bin/sh
# Restore a database dump (and optionally an uploads archive) into the running stack.
#
#   ./deploy/backup/restore.sh backups/db-20261122-030000.dump [backups/uploads-20261122-030000.tar.gz]
#
# Run from the project root on the server. The app is stopped during the restore.
set -eu

DUMP=${1:?usage: restore.sh <db-dump> [uploads-archive]}
UPLOADS=${2:-}
[ -f "$DUMP" ] || { echo "Dump not found: $DUMP" >&2; exit 1; }

# shellcheck disable=SC1091
set -a; . ./.env; set +a
DB_USER=${POSTGRES_USER:-dany}
DB_NAME=${POSTGRES_DB:-dany_shop}

printf 'This will REPLACE database "%s" with %s. Type "restore" to continue: ' "$DB_NAME" "$DUMP"
read -r answer
[ "$answer" = "restore" ] || { echo "Aborted."; exit 1; }

docker compose --profile prod stop app scheduler
echo "Restoring database…"
docker compose exec -T db pg_restore --clean --if-exists --no-owner -U "$DB_USER" -d "$DB_NAME" < "$DUMP"

if [ -n "$UPLOADS" ]; then
  [ -f "$UPLOADS" ] || { echo "Uploads archive not found: $UPLOADS" >&2; exit 1; }
  echo "Restoring uploads…"
  docker compose --profile prod run --rm -T --no-deps --entrypoint sh -v "$(pwd)/$UPLOADS:/restore.tar.gz:ro" app \
    -c 'rm -rf /app/storage/uploads/* && tar -xzf /restore.tar.gz -C /app/storage/uploads'
fi

docker compose --profile prod up -d app scheduler
echo "Restore complete."
