#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BIZIE_BACKUP_URL:-}" ]]; then
  echo "Missing BIZIE_BACKUP_URL (e.g. https://your-app.vercel.app)"
  exit 1
fi

if [[ -z "${BASIC_AUTH_USER:-}" || -z "${BASIC_AUTH_PASS:-}" ]]; then
  echo "Missing BASIC_AUTH_USER / BASIC_AUTH_PASS"
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
outfile="bizie-backup-${timestamp}.json"

curl -sS -u "${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}" \
  "${BIZIE_BACKUP_URL}/api/backup" \
  -o "${outfile}"

echo "Backup saved to ${outfile}"
