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
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.source-revision ./.source-revision
EXPOSE 3000
CMD ["node", "server.js"]
