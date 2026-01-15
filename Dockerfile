# ---------- build stage ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma during build
RUN apt-get update -y && apt-get install -y openssl libssl-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- run stage ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl libssl-dev

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]