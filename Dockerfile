FROM node:20-bookworm-slim

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./

# Install deps
RUN npm install

# Copy Prisma schema FIRST
COPY prisma ./prisma

# Generate Prisma Client (CRITICAL)
RUN npx prisma generate

# Copy source & build
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]