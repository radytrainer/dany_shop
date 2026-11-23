#!/bin/sh
# Runs inside the "backup" container. Takes a backup once a day at BACKUP_HOUR (server time)
# and keeps BACKUP_KEEP_DAYS days of history. Also runs one backup on start-up.
set -eu

run_backup() {
  sh /scripts/backup.sh || echo "[backup] FAILED at $(date -Iseconds)" >&2
}

run_backup
while true; do
  now_h=$(date +%H)
  now_m=$(date +%M)
  # seconds until next BACKUP_HOUR:00
  target=$(( ${BACKUP_HOUR:-3} * 3600 ))
  current=$(( 10#$now_h * 3600 + 10#$now_m * 60 ))
  wait=$(( target - current ))
  [ "$wait" -le 0 ] && wait=$(( wait + 86400 ))
  sleep "$wait"
  run_backup
done
