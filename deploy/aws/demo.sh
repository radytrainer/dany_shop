#!/usr/bin/env bash
# Demo catalog on the live server: example products, banners and category pictures that show
# how the shop looks and that the seller edits or replaces with their own.
#
#   bash deploy/aws/demo.sh load     # add the demo catalog (skips anything that already exists)
#   bash deploy/aws/demo.sh remove   # delete it again (demo items in real orders are archived)
#
# Safe in production: never creates demo logins or placeholder Telegram/WhatsApp accounts.
# Products you created yourself are never removed (only exact demo slug + SKU pairs).
set -euo pipefail
cd "$(dirname "$0")/../.."

COMPOSE=(docker compose --profile prod)
case "${1:-}" in
  load)
    "${COMPOSE[@]}" run --rm --no-deps -e SEED_DEMO=true migrate npx prisma db seed
    ;;
  remove)
    read -r -p "Delete all demo products, banners and collections? Type 'remove' to confirm: " answer
    [ "$answer" = remove ] || { echo "Cancelled."; exit 1; }
    "${COMPOSE[@]}" run --rm --no-deps -e DEMO_ACTION=remove migrate npx prisma db seed
    ;;
  *)
    echo "Usage: bash deploy/aws/demo.sh load|remove"; exit 1
    ;;
esac
echo "Done. Refresh https://${DOMAIN:-your-domain}/ to see the change."
