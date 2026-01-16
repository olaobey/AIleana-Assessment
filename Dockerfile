# Builder stage
# ------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install system deps needed by Prisma engines
RUN apt-get update -y \
  && apt-get install -y openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Force Prisma to generate the correct engine for Leapcell (linux-arm64 + openssl 3)
ENV PRISMA_CLI_BINARY_TARGETS=linux-arm64-openssl-3.0.x
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# ------------------------------
# Runner stage
# ------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install runtime deps (openssl 3)
RUN apt-get update -y \
  && apt-get install -y openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy everything needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Nest default port (change if your app uses another)
EXPOSE 3000

# Start
CMD ["node", "dist/main.js"]