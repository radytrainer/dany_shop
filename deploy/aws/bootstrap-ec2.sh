#!/usr/bin/env bash
# One-time preparation of a fresh Ubuntu 24.04 EC2 instance for the DANY shop.
# Run on the instance as the default "ubuntu" user:
#
#   bash /opt/dany-shop/deploy/aws/bootstrap-ec2.sh
#
# Safe to run again: every step checks whether it is already done.
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/dany-shop}
SWAP_GB=${SWAP_GB:-4}
RUN_USER=${SUDO_USER:-$USER}

echo "→ System updates"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl rsync unattended-upgrades cron
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "→ Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$RUN_USER"
sudo systemctl enable --now docker

# Keep container logs from filling the disk.
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{ "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "5" } }' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl restart docker
fi

# Building the Next.js image needs ~3 GB of memory; small instances (t3.small) need swap.
echo "→ Swap (${SWAP_GB} GB)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l "${SWAP_GB}G" /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf >/dev/null
  sudo sysctl --system >/dev/null
fi

echo "→ App directory ${APP_DIR}"
sudo mkdir -p "$APP_DIR/backups"
sudo chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"

# AWS CLI for optional off-server backups to S3 (uses the instance's IAM role, no keys on disk).
if ! command -v aws >/dev/null 2>&1; then
  echo "→ AWS CLI"
  sudo snap install aws-cli --classic || echo "  (AWS CLI install skipped; only needed for S3 backups)"
fi

echo "→ Scheduled jobs"
CRON_FILE=/etc/cron.d/dany-shop
sudo tee "$CRON_FILE" >/dev/null <<EOF
# Load certificates renewed by the certbot container.
17 4 * * 1 $RUN_USER cd $APP_DIR && docker compose --profile prod exec -T nginx nginx -s reload >/dev/null 2>&1
# Copy nightly backups to S3 when BACKUP_S3_BUCKET is set in .env (see deploy/aws/backup-to-s3.sh).
45 4 * * * $RUN_USER cd $APP_DIR && bash deploy/aws/backup-to-s3.sh >> $APP_DIR/backups/s3-sync.log 2>&1
# Remove unused images left behind by updates.
30 5 * * 0 root docker image prune -af --filter "until=168h" >/dev/null 2>&1
EOF
sudo chmod 644 "$CRON_FILE"

echo
echo "Bootstrap complete. Log out and back in once so the docker group applies, then run:"
echo "  cd $APP_DIR && bash deploy/aws/deploy.sh"
