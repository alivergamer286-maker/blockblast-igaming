FROM node:20-bookworm-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN npm install

COPY tsconfig.json ./
COPY src ./src

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npx prisma generate
RUN npx tsc

FROM node:20-bookworm-slim AS runner

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY prisma ./prisma

RUN npm install --omit=dev

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start server first; migrate runs in the same shell before listen only if DB is up
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/index.js"]
