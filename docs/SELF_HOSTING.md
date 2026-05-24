# Self Hosting

## Bare Node

```bash
cp .env.example .env.local
npm ci
npm run build
npm run start
```

Bind behind a reverse proxy if exposing outside the LAN. Keep `.env.local` and `HONCHO_API_KEY` out of source control.

## Docker Compose

```bash
HONCHO_BASE_URL=http://localhost:8000 \
HONCHO_WORKSPACE_ID=example-workspace \
docker compose -f docker-compose.dashboard.yml up --build -d
```

The compose file exposes port 3000 and uses `restart: unless-stopped`.

## Security posture

- Default read-only.
- Honcho API key only in server environment.
- Server proxy prevents direct browser-to-Honcho CORS/API-key leakage.
- Destructive controls are visibly disabled until mutations are enabled.
