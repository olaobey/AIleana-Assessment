# ---------- builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# 🔑 REQUIRED for Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm install

# copy prisma schema first
COPY prisma ./prisma

# generate prisma client
RUN npx prisma generate

# copy source and build
COPY . .
RUN npm run build


# ---------- runner ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]