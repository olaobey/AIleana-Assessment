# Builder stage
# ------------------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Install system deps needed by Prisma engines (includes libssl1.1 on bullseye)
RUN apt-get update -y \
  && apt-get install -y openssl libssl1.1 ca-certificates \
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

# Runtime deps (libssl1.1 required if Prisma selects openssl-1.1.x)
RUN apt-get update -y \
  && apt-get install -y openssl libssl1.1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]