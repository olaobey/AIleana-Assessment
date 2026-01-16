# ---------- build stage ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema
COPY prisma ./prisma

# Force Data Proxy generation (NO native engine)
ENV PRISMA_CLIENT_ENGINE_TYPE=dataproxy

RUN npx prisma generate

# Copy compiled app
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]