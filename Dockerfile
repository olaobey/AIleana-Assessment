# ---------- builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl libssl3

COPY package*.json ./
RUN npm install

COPY prisma ./prisma

# 🔥 ENSURE CLEAN PRISMA GENERATION
RUN rm -rf node_modules/.prisma
RUN npx prisma generate

COPY . .
RUN npm run build


# ---------- runner ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl libssl3

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]