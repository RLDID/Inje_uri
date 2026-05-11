# syntax=docker/dockerfile:1

FROM node:24.11.1-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/injeuri?schema=public"

RUN npx prisma generate
RUN npm run build

RUN mkdir -p .next/standalone/.next \
  && cp -r .next/static .next/standalone/.next/static \
  && if [ -d public ]; then cp -r public .next/standalone/public; fi

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
