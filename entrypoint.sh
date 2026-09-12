#!/bin/sh
set -eu

mkdir -p /app/data/media
chown -R nextjs:nodejs /app/data

exec su-exec nextjs sh -c 'node scripts/migrate.mjs && exec node server.js'
