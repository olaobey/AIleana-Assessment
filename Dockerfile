# ---------- build stage ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client for Data Proxy
RUN npx prisma generate --data-proxy

# Build TypeScript code
RUN npm run build

# ---------- run stage ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Copy package files and install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built JS files
COPY --from=builder /app/dist ./dist

# Copy Prisma client generated in builder (Data Proxy version)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]