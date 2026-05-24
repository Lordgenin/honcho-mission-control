#!/usr/bin/env bash
set -Eeuo pipefail

REMOTE_HOST="${CT122_HOST:-192.168.20.14}"
REMOTE_USER="${CT122_USER:-dashboard-deploy}"
SSH_KEY="${CT122_SSH_KEY:-/root/.ssh/hermes_agent_ed25519}"
REMOTE_APP="${CT122_APP_DIR:-/opt/honcho-mission-control}"
REMOTE_INCOMING="${CT122_INCOMING_DIR:-/home/dashboard-deploy/incoming/honcho-mission-control}"
REMOTE_DEPLOY_CMD="${CT122_DEPLOY_CMD:-/usr/local/sbin/honcho-dashboard-deploy}"
LOCAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REV="$(git -C "$LOCAL_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="/tmp/honcho-mission-control-${REV}-${STAMP}.tar.gz"
REMOTE_ARCHIVE="/tmp/honcho-mission-control-${REV}-${STAMP}.tar.gz"
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$REMOTE_USER@$REMOTE_HOST")
SCP=(scp -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)

cd "$LOCAL_ROOT"
echo "Deploying $LOCAL_ROOT@$REV to $REMOTE_USER@$REMOTE_HOST via $REMOTE_DEPLOY_CMD"

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

echo "Installing source into incoming deploy directory and forcing live mode..."
"${SSH[@]}" "REMOTE_APP='$REMOTE_APP' REMOTE_INCOMING='$REMOTE_INCOMING' REMOTE_ARCHIVE='$REMOTE_ARCHIVE' REV='$REV' bash -s" <<'REMOTE'
set -Eeuo pipefail
mkdir -p "$REMOTE_INCOMING"
TMPDIR="/tmp/honcho-mission-control-src-$REV-$$"
mkdir -p "$TMPDIR"
tar -xzf "$REMOTE_ARCHIVE" -C "$TMPDIR"
rm -f "$REMOTE_ARCHIVE"
# Preserve existing private deployment env if present, otherwise use source env/example if available.
if [ -r "$REMOTE_APP/.env" ]; then
  cp "$REMOTE_APP/.env" "$TMPDIR/.env"
elif [ -r "$REMOTE_INCOMING/.env" ]; then
  cp "$REMOTE_INCOMING/.env" "$TMPDIR/.env"
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
set_kv USE_DEMO_DATA false "$TMPDIR/.env"
set_kv ALLOW_LIVE_PUBLIC_DATA true "$TMPDIR/.env"
set_kv HONCHO_WORKSPACE_ID agent-company "$TMPDIR/.env"
find "$REMOTE_INCOMING" -mindepth 1 ! -name '.env' -exec rm -rf {} +
cp -a "$TMPDIR"/. "$REMOTE_INCOMING"/
printf 'main@%s\n' "$REV" > "$REMOTE_INCOMING/.source-revision"
rm -rf "$TMPDIR"
REMOTE

echo "Running scoped root deploy helper..."
"${SSH[@]}" "sudo -n '$REMOTE_DEPLOY_CMD'"

echo "Deployment script completed. Source revision: main@$REV"
