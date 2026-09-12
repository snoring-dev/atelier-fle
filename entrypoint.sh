#!/bin/sh
set -eu

mkdir -p /app/data/media

node scripts/migrate.mjs

exec node server.js
