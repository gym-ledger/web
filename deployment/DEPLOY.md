# Deployment Guide — gym-ledger/web

Runs as a single Docker container serving the Next.js standalone build on port **3000**.

---

## Prerequisites

- Docker + Docker Compose v2
- Git

---

## Important: Build-time Environment Variables

`NEXT_PUBLIC_*` variables in Next.js are **inlined at build time**, not injected at runtime. This means:

- The API URL is compiled into the JavaScript bundle during `docker compose up --build`
- Changing `NEXT_PUBLIC_API_URL` in `.env` requires a **rebuild** (`docker compose up -d --build`)
- The `.env` file is read by Docker Compose to pass the value as a build argument — the running container itself does not need it

---

## Steps

### 1. Clone the repository

```bash
git clone https://github.com/gym-ledger/web.git web
cd web
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Open `.env` and set:

```
NEXT_PUBLIC_API_URL=http://your-server-ip-or-domain:4000/api/v1
```

Use the public IP or domain where the API (`gym-ledger/api`) is reachable from the user's browser — not `localhost`.

### 3. Make `deploy.sh` executable (first time only)

```bash
chmod +x deploy.sh
```

### 4. Deploy

```bash
bash deploy.sh
```

This pulls the latest code, builds the Docker image (with `NEXT_PUBLIC_API_URL` baked in), and starts the container.

### 5. Verify

```bash
curl -I http://localhost:3000
# HTTP/1.1 200 OK
```

View logs:

```bash
docker logs -f gym-ledger-web
```

---

## Subsequent Deploys

```bash
bash deploy.sh
```

If `NEXT_PUBLIC_API_URL` has not changed, the Docker layer cache means the rebuild is fast.

---

## Ports

| Host port | Container port | Description |
|---|---|---|
| 3000 | 3000 | Next.js app |

To change the host port, edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"   # serve on host port 8080
```

---

## Troubleshooting

**App loads but API calls fail (network errors or CORS)**
- Confirm `NEXT_PUBLIC_API_URL` points to the public IP/domain of the API, not `localhost` or an internal Docker address
- Rebuild after changing: `docker compose up -d --build`

**Container crashes immediately**
```bash
docker logs gym-ledger-web
```
A build error during `npm run build` inside Docker usually means a TypeScript or ESLint error. Run `npm run build` locally to reproduce.

**Old API URL still baked in after updating `.env`**
Run a full rebuild: `docker compose up -d --build --no-cache`
