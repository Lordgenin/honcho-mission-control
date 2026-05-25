FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM deps AS builder
WORKDIR /app
COPY . .
RUN test -f .source-revision || printf 'unknown\n' > .source-revision
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    HONCHO_BASE_URL=http://localhost:8000 \
    ENABLE_MUTATIONS=false \
    USE_DEMO_DATA=true \
    ALLOW_LIVE_PUBLIC_DATA=false \
    HERMES_KANBAN_DBS=/data/hermes/kanban.db \
    HERMES_KANBAN_DB=/data/hermes/kanban.db \
    HERMES_KANBAN_DATABASE=/data/hermes/kanban.db \
    NEXT_PUBLIC_DASHBOARD_NAME="Honcho Mission Control"
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.source-revision ./.source-revision
EXPOSE 3000
CMD ["node", "server.js"]
