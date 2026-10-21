# gym-ledger/web

Mobile-first web app for end users — workout tracking, body weight progress, and program management.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 · React 19 · TypeScript |
| Styling | Tailwind CSS 4 · shadcn/ui |
| State | Zustand · TanStack Query |
| Forms | React Hook Form · Zod |
| Animation | Framer Motion |
| HTTP | Axios |
| Deployment | Docker · Docker Compose |

## Local Development

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_API_URL
npm install
npm run dev
```

## Deployment

→ [Deployment Guide](deployment/DEPLOY.md)
