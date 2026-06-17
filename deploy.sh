#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── .env check ─────────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
    echo "Error: .env not found in $SCRIPT_DIR" >&2
    echo "       Copy .env.example to .env and set NEXT_PUBLIC_API_URL." >&2
    exit 1
fi

# ── Git pull (fast-forward only) ───────────────────────────────────────────────
echo "==> Fetching latest changes..."
git fetch origin

CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
echo "==> Merging origin/$CURRENT_BRANCH (fast-forward only)..."
git merge --ff-only "origin/$CURRENT_BRANCH"

# ── Build and restart ──────────────────────────────────────────────────────────
echo "==> Building and restarting container..."
docker compose up -d --build --remove-orphans

echo ""
echo "==> Deployment complete. Running containers:"
docker compose ps
