#!/usr/bin/env bash
# Upload this project to the EC2 instance (no git remote needed). Run from the project root,
# on your computer (Git Bash on Windows works):
#
#   EC2_KEY=~/.ssh/dany-shop.pem ./deploy/aws/push.sh
#   EC2_KEY=~/.ssh/dany-shop.pem ./deploy/aws/push.sh --deploy   # upload, then build and restart
#
# Never uploads secrets or local state: .env*, node_modules, .next, storage, backups, test output.
# The server keeps its own .env, backups/ and Docker volumes; files deleted locally are deleted there.
set -euo pipefail

EC2_HOST=${EC2_HOST:-3.27.91.153}
EC2_USER=${EC2_USER:-ubuntu}
EC2_KEY=${EC2_KEY:?set EC2_KEY to your .pem key file}
APP_DIR=${APP_DIR:-/opt/dany-shop}

[ -f package.json ] && [ -f docker-compose.yml ] || { echo "Run from the project root."; exit 1; }

SSH=(ssh -i "$EC2_KEY" -o StrictHostKeyChecking=accept-new "$EC2_USER@$EC2_HOST")
ARCHIVE=$(mktemp -t dany-shop-XXXXXX.tar.gz)
trap 'rm -f "$ARCHIVE"' EXIT

echo "→ Packing project"
tar -czf "$ARCHIVE" \
  --exclude=./node_modules --exclude=./.next --exclude=./.git \
  --exclude='./.env' --exclude='./.env.*' --exclude=./storage --exclude=./backups \
  --exclude=./graphify-out --exclude=./playwright-report --exclude=./test-results --exclude=./coverage \
  --exclude=./src/generated --exclude=./.claude --exclude=./.agents --exclude=./.windsurf \
  --exclude='*.log' --exclude='*.tsbuildinfo' \
  .
echo "  $(du -h "$ARCHIVE" | cut -f1)"

echo "→ Uploading to $EC2_USER@$EC2_HOST"
scp -i "$EC2_KEY" -o StrictHostKeyChecking=accept-new "$ARCHIVE" "$EC2_USER@$EC2_HOST:/tmp/dany-shop.tar.gz"

echo "→ Syncing into $APP_DIR"
"${SSH[@]}" "set -e
  rm -rf /tmp/dany-shop-release && mkdir -p /tmp/dany-shop-release
  tar -xzf /tmp/dany-shop.tar.gz -C /tmp/dany-shop-release
  mkdir -p $APP_DIR
  rsync -a --delete \
    --exclude=/.env --exclude=/backups --exclude=/storage \
    /tmp/dany-shop-release/ $APP_DIR/
  rm -rf /tmp/dany-shop-release /tmp/dany-shop.tar.gz
  chmod +x $APP_DIR/deploy/*.sh $APP_DIR/deploy/*/*.sh"

if [ "${1:-}" = "--deploy" ]; then
  echo "→ Deploying"
  "${SSH[@]}" "cd $APP_DIR && bash deploy/aws/deploy.sh"
fi
echo "Done."
