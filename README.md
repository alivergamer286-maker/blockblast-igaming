# Block Blast iGaming Platform

Plataforma iGaming completa com clone fiel do **Block Blast**.

- Backend Node.js + Express + TypeScript + PostgreSQL + Redis
- Frontend React + TypeScript + Vite + Canvas
- Auth JWT, Wallet, Leaderboard, Anti-cheat server-side
- Payment Gateway: placeholder only

## Como rodar

```bash
docker-compose up -d postgres redis
cd backend && cp .env.example .env && npm i && npx prisma migrate dev && npm run dev
cd frontend && npm i && npm run dev
```

Acesse http://localhost:5173

Feito para Axion.
