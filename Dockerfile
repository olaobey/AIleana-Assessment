# Builder stage
# ------------------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# System deps:
# - python3 + build-essential: required for node-gyp (argon2)
# - openssl + libssl1.1: for Prisma engine (if it defaults to openssl-1.1)
RUN apt-get update -y \
  && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    openssl \
    libssl1.1 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build


# Runner stage
# ------------------------------
FROM node:20-bullseye-slim AS runner

WORKDIR /app

# Runtime deps only (no compilers needed here)
RUN apt-get update -y \
  && apt-get install -y openssl libssl1.1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]