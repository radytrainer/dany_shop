#!/bin/sh
# First-time HTTPS setup. Creates a temporary self-signed certificate so nginx can start,
# obtains a real Let's Encrypt certificate via the webroot challenge, then reloads nginx.
#
#   DOMAIN=shop.example.com EMAIL=you@example.com ./deploy/init-letsencrypt.sh
set -eu

DOMAIN=${DOMAIN:?set DOMAIN}
EMAIL=${EMAIL:?set EMAIL (for expiry notices)}
STAGING=${STAGING:-0}   # set STAGING=1 to test against the Let's Encrypt staging CA

echo "→ Creating temporary certificate for $DOMAIN"
docker compose --profile prod run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj /CN=localhost"

echo "→ Starting nginx"
docker compose --profile prod up -d nginx

echo "→ Removing temporary certificate"
docker compose --profile prod run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

STAGING_ARG=""
[ "$STAGING" = "1" ] && STAGING_ARG="--staging"

echo "→ Requesting Let's Encrypt certificate"
docker compose --profile prod run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  $STAGING_ARG --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN" -d "www.$DOMAIN" --rsa-key-size 4096 --force-renewal

echo "→ Reloading nginx"
docker compose --profile prod exec nginx nginx -s reload
echo "Done. https://$DOMAIN"
