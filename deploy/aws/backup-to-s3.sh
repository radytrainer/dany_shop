#!/usr/bin/env bash
# Copy ./backups to S3 so a lost or terminated instance does not take the backups with it.
# Runs daily from cron (installed by bootstrap-ec2.sh). Does nothing unless BACKUP_S3_BUCKET is set in .env.
#
# Credentials come from the EC2 instance's IAM role (deploy/aws/iam-backup-policy.json); no keys on disk.
set -euo pipefail
cd "$(dirname "$0")/../.."

BUCKET=$(grep -E '^BACKUP_S3_BUCKET=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
[ -n "$BUCKET" ] || exit 0
command -v aws >/dev/null || { echo "$(date -Is) aws CLI not installed"; exit 1; }

# Only finished backup files; S3 lifecycle rules (not this script) decide how long they are kept.
aws s3 sync ./backups "s3://$BUCKET/dany-shop/" --exclude "*" --include "db-*.dump" --include "uploads-*.tar.gz" --only-show-errors
echo "$(date -Is) synced to s3://$BUCKET/dany-shop/"
