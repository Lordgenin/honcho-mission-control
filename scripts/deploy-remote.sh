#!/usr/bin/env bash
set -Eeuo pipefail

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    printf 'Missing required environment variable: %s\n' "$name" >&2
    exit 2
  fi
}

require_env DEPLOY_HOST
require_env DEPLOY_USER
require_env DEPLOY_SSH_KEY
require_env DEPLOY_APP_DIR
require_env DEPLOY_INCOMING_DIR
require_env DEPLOY_COMMAND

REMOTE_HOST="$DEPLOY_HOST"
REMOTE_USER="$DEPLOY_USER"
SSH_KEY="$DEPLOY_SSH_KEY"
REMOTE_APP="$DEPLOY_APP_DIR"
REMOTE_INCOMING="$DEPLOY_INCOMING_DIR"
REMOTE_DEPLOY_CMD="$DEPLOY_COMMAND"
LOCAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REV="$(git -C "$LOCAL_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="/tmp/honcho-mission-control-${REV}-${STAMP}.tar.gz"
REMOTE_ARCHIVE="/tmp/honcho-mission-control-${REV}-${STAMP}.tar.gz"
LOCAL_KANBAN_DB="${LOCAL_KANBAN_DB:-}"
LIVE_KANBAN_HOST_DB="${LIVE_KANBAN_HOST_DB:-}"
DEPLOY_HEALTH_URL="${DEPLOY_HEALTH_URL:-http://$REMOTE_HOST:3000/api/health}"
EXPECT_LIVE_KANBAN="${EXPECT_LIVE_KANBAN:-}"
REMOTE_KANBAN_DB=""
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$REMOTE_USER@$REMOTE_HOST")
SCP=(scp -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)

cd "$LOCAL_ROOT"
echo "Deploying $LOCAL_ROOT@$REV to $REMOTE_USER@$REMOTE_HOST via configured deploy command"

echo "Verifying SSH..."
"${SSH[@]}" 'hostname; whoami; pwd'

echo "Creating deployment archive..."
tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.patch' \
  -czf "$ARCHIVE" .

"${SCP[@]}" "$ARCHIVE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_ARCHIVE"
rm -f "$ARCHIVE"

if [ -n "$LOCAL_KANBAN_DB" ] && [ -r "$LOCAL_KANBAN_DB" ]; then
  REMOTE_KANBAN_DB="/tmp/honcho-kanban-${REV}-${STAMP}.db"
  echo "Uploading sanitized Kanban DB snapshot for read-only dashboard mount..."
  "${SCP[@]}" "$LOCAL_KANBAN_DB" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_KANBAN_DB"
else
  echo "LOCAL_KANBAN_DB not set/readable; deploy will rely on remote host mount or show Kanban degraded." >&2
fi

echo "Installing source into incoming deploy directory with safe public defaults..."
"${SSH[@]}" "REMOTE_APP='$REMOTE_APP' REMOTE_INCOMING='$REMOTE_INCOMING' REMOTE_ARCHIVE='$REMOTE_ARCHIVE' REMOTE_KANBAN_DB='$REMOTE_KANBAN_DB' LIVE_KANBAN_HOST_DB='$LIVE_KANBAN_HOST_DB' REV='$REV' bash -s" <<'REMOTE'
set -Eeuo pipefail
mkdir -p "$REMOTE_INCOMING"
TMPDIR="/tmp/honcho-mission-control-src-$REV-$$"
mkdir -p "$TMPDIR"
tar -xzf "$REMOTE_ARCHIVE" -C "$TMPDIR"
rm -f "$REMOTE_ARCHIVE"
# Prefer an operator-prepared incoming .env so live/rollback candidates copied to
# REMOTE_INCOMING drive Docker Compose on the next deploy. Fall back to the
# currently deployed private env only when no prepared incoming env exists.
if [ -r "$REMOTE_INCOMING/.env" ]; then
  cp "$REMOTE_INCOMING/.env" "$TMPDIR/.env"
elif [ -r "$REMOTE_APP/.env" ]; then
  cp "$REMOTE_APP/.env" "$TMPDIR/.env"
elif [ -f "$TMPDIR/.env.example" ]; then
  cp "$TMPDIR/.env.example" "$TMPDIR/.env"
else
  : > "$TMPDIR/.env"
fi
set_kv() {
  key="$1"; value="$2"; file="$3"
  if grep -q "^${key}=" "$file"; then
    python3 - "$key" "$value" "$file" <<'PY'
from pathlib import Path
import sys
key, value, path = sys.argv[1], sys.argv[2], Path(sys.argv[3])
lines = path.read_text().splitlines()
for i, line in enumerate(lines):
    if line.startswith(key + '='):
        lines[i] = f'{key}={value}'
path.write_text('\n'.join(lines) + '\n')
PY
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}
set_default_kv() {
  key="$1"; value="$2"; file="$3"
  if ! grep -q "^${key}=" "$file"; then
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}
unset_kv() {
  key="$1"; file="$2"
  if grep -q "^${key}=" "$file"; then
    python3 - "$key" "$file" <<'PY'
from pathlib import Path
import sys
key, path = sys.argv[1], Path(sys.argv[2])
lines = [line for line in path.read_text().splitlines() if not line.startswith(key + '=')]
path.write_text('\n'.join(lines) + ('\n' if lines else ''))
PY
  fi
}
set_default_kv USE_DEMO_DATA false "$TMPDIR/.env"
set_default_kv ALLOW_LIVE_PUBLIC_DATA false "$TMPDIR/.env"
set_default_kv HERMES_KANBAN_DBS /data/hermes/kanban.db "$TMPDIR/.env"
set_default_kv HERMES_KANBAN_DB /data/hermes/kanban.db "$TMPDIR/.env"
set_default_kv HERMES_KANBAN_DATABASE /data/hermes/kanban.db "$TMPDIR/.env"
if [ -n "$LIVE_KANBAN_HOST_DB" ]; then
  set_kv HERMES_KANBAN_HOST_DB "$LIVE_KANBAN_HOST_DB" "$TMPDIR/.env"
  set_kv HERMES_KANBAN_SOURCE_MODE live "$TMPDIR/.env"
  unset_kv HERMES_KANBAN_SNAPSHOT_HOST_DB "$TMPDIR/.env"
  python3 - "$LIVE_KANBAN_HOST_DB" "$TMPDIR/docker-compose.dashboard.yml" <<'PY'
from pathlib import Path
import sys
live_host_db, compose_path = sys.argv[1], Path(sys.argv[2])
text = compose_path.read_text()
text = text.replace('${HERMES_KANBAN_HOST_DB:-./runtime/kanban.db}', '${HERMES_KANBAN_HOST_DB:-' + live_host_db + '}')
compose_path.write_text(text)
PY
elif [ -n "$REMOTE_KANBAN_DB" ] && [ -r "$REMOTE_KANBAN_DB" ]; then
  mkdir -p "$TMPDIR/runtime"
  cp "$REMOTE_KANBAN_DB" "$TMPDIR/runtime/kanban.db"
  rm -f "$REMOTE_KANBAN_DB"
  set_kv HERMES_KANBAN_HOST_DB "$REMOTE_INCOMING/runtime/kanban.db" "$TMPDIR/.env"
  set_kv HERMES_KANBAN_SOURCE_MODE snapshot "$TMPDIR/.env"
  set_kv HERMES_KANBAN_SNAPSHOT_HOST_DB "$REMOTE_INCOMING/runtime/kanban.db" "$TMPDIR/.env"
else
  set_default_kv HERMES_KANBAN_HOST_DB '' "$TMPDIR/.env"
  set_default_kv HERMES_KANBAN_SOURCE_MODE live "$TMPDIR/.env"
fi
mkdir -p "$TMPDIR/runtime"
cp "$TMPDIR/.env" "$TMPDIR/runtime/dashboard.env"
chmod 600 "$TMPDIR/runtime/dashboard.env"
find "$REMOTE_INCOMING" -mindepth 1 ! -name '.env' ! -name '.env.*' -exec rm -rf {} +
cp -a "$TMPDIR"/. "$REMOTE_INCOMING"/
printf 'main@%s\n' "$REV" > "$REMOTE_INCOMING/.source-revision"
rm -rf "$TMPDIR"
REMOTE

echo "Running configured deploy helper..."
"${SSH[@]}" "sudo -n '$REMOTE_DEPLOY_CMD'"

if [ "$EXPECT_LIVE_KANBAN" = "true" ] || [ -n "$LIVE_KANBAN_HOST_DB" ]; then
  echo "Verifying deployed health does not report a static Kanban snapshot in live mode..."
  HEALTH_JSON="$(curl -fsS "$DEPLOY_HEALTH_URL")"
  HEALTH_JSON="$HEALTH_JSON" python3 - <<'PY'
import json, os
payload = json.loads(os.environ.get('HEALTH_JSON') or '{}')
kanban = payload.get('kanban') or {}
source_mode = kanban.get('source_mode')
source_label = kanban.get('source_label')
if source_mode == 'static-snapshot' or source_label == 'static-snapshot-db':
    raise SystemExit(f'live Kanban deployment rejected static snapshot health: source_mode={source_mode!r}, source_label={source_label!r}')
if not kanban.get('configured'):
    raise SystemExit('live Kanban deployment rejected unconfigured Kanban health')
print(f"live Kanban health accepted: source_mode={source_mode}, source_label={source_label}, source_readable={kanban.get('source_readable')}")
PY
fi

echo "Deployment script completed. Source revision: main@$REV"
