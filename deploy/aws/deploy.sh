#!/usr/bin/env bash
# Build and (re)start the production stack on the server. Run in the app directory:
#
#   cd /opt/dany-shop && bash deploy/aws/deploy.sh
#
# First run: checks .env, builds, migrates + seeds, obtains the HTTPS certificate, starts everything.
# Later runs: rebuilds, applies new migrations, restarts the app with minimal downtime.
set -euo pipefail
cd "$(dirname "$0")/../.."

COMPOSE=(docker compose --profile prod)

# ─── 1. Check .env ──────────────────────────────────────────────────────────
[ -f .env ] || { echo "✗ .env missing. Copy deploy/aws/env.production.example to .env and fill it in."; exit 1; }
set -a; . ./.env; set +a

fail=0
need() { # name, description
  local v="${!1:-}"
  if [ -z "$v" ] || [[ "$v" == *change-me* ]] || [[ "$v" == *replace-with* ]] || [[ "$v" == *example.com* ]]; then
    echo "✗ $1 is not set ($2)"; fail=1
  fi
}
need DOMAIN "your domain, e.g. dany-meas.store"
need APP_URL "https://<DOMAIN>"
need POSTGRES_PASSWORD "openssl rand -hex 24"
need SESSION_SECRET "openssl rand -hex 32"
need CRON_SECRET "openssl rand -hex 24"
need SEED_ADMIN_EMAIL "first admin login"
[ "${NODE_ENV:-}" = "production" ] || { echo "✗ NODE_ENV must be production"; fail=1; }
[ "${SEED_DEMO:-false}" = "false" ] || { echo "✗ SEED_DEMO must be false in production"; fail=1; }
[ "${#SESSION_SECRET}" -ge 32 ] || { echo "✗ SESSION_SECRET must be at least 32 characters"; fail=1; }
[[ "${POSTGRES_PASSWORD:-}" =~ ^[A-Za-z0-9]+$ ]] || { echo "✗ POSTGRES_PASSWORD: use letters and digits only (it goes into a URL)"; fail=1; }
[ "$fail" = 0 ] || exit 1
echo "✓ .env looks complete for $DOMAIN"

# ─── 2. Build ───────────────────────────────────────────────────────────────
echo "→ Building images (first build takes several minutes)"
"${COMPOSE[@]}" build app migrate

# ─── 3. Database, migrations, app ──────────────────────────────────────────
echo "→ Starting database and applying migrations"
"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" up migrate            # runs to completion: prisma migrate deploy + reference seed
"${COMPOSE[@]}" up -d app scheduler backup

# ─── 4. HTTPS (only when no certificate exists yet) ────────────────────────
has_cert() { "${COMPOSE[@]}" run --rm --no-deps --entrypoint sh certbot -c "test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem" >/dev/null 2>&1; }
if ! has_cert; then
  # Let's Encrypt can only issue once DNS points here.
  PUBLIC_IP=$(curl -fsS -m 3 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" \
    | xargs -I{} curl -fsS -m 3 -H "X-aws-ec2-metadata-token: {}" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  DNS_IP=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
  if [ -z "$DNS_IP" ] || { [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" != "$PUBLIC_IP" ]; }; then
    echo "✗ $DOMAIN resolves to '${DNS_IP:-nothing}', this server is '${PUBLIC_IP:-unknown}'."
    echo "  Create DNS A records for $DOMAIN and www.$DOMAIN → ${PUBLIC_IP:-<server IP>}, wait for them to resolve, then run this script again."
    echo "  (The app is already running inside Docker; only the public HTTPS front end is waiting.)"
    exit 1
  fi
  WWW=1
  getent ahostsv4 "www.$DOMAIN" >/dev/null 2>&1 || { WWW=0; echo "  www.$DOMAIN has no DNS record — certificate will cover $DOMAIN only."; }
  : "${LETSENCRYPT_EMAIL:?set LETSENCRYPT_EMAIL in .env (certificate expiry notices)}"
  DOMAIN="$DOMAIN" EMAIL="$LETSENCRYPT_EMAIL" WWW="$WWW" sh deploy/init-letsencrypt.sh
fi

# ─── 5. Everything up, then verify ─────────────────────────────────────────
"${COMPOSE[@]}" up -d
echo "→ Waiting for the app to become healthy"
for _ in $(seq 1 40); do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q app)" 2>/dev/null || echo starting)
  [ "$status" = healthy ] && break
  sleep 3
done
echo "  app: $status"
code=$(curl -s -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true)
echo "  https://$DOMAIN/ → HTTP $code"
"${COMPOSE[@]}" ps
[ "$status" = healthy ] && [ "$code" = 200 ] && echo "✓ Deployed: https://$DOMAIN" || { echo "! Check logs: docker compose --profile prod logs --tail=100 app nginx"; exit 1; }
