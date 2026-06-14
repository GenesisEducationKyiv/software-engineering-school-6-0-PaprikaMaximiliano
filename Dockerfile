FROM node:20-bookworm-slim

WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/release_notifier?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests

EXPOSE 3000

CMD ["sh", "-c", "npm run db:deploy && npm run dev:api"]
