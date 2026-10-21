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

RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Required for the standalone server to accept connections from outside the container
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
