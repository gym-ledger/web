# ── Builder ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are inlined at build time — must be passed as build args
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_OPERATOR_NAME
ENV NEXT_PUBLIC_OPERATOR_NAME=${NEXT_PUBLIC_OPERATOR_NAME}
ARG NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL
ENV NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL=${NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL}
ARG NEXT_PUBLIC_TERMS_GOVERNING_LAW
ENV NEXT_PUBLIC_TERMS_GOVERNING_LAW=${NEXT_PUBLIC_TERMS_GOVERNING_LAW}

RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Required for the standalone server to accept connections from outside the container
ENV HOSTNAME=0.0.0.0

# Owned by the unprivileged "node" user the server runs as (it writes .next/cache).
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
