# Builder stage
# ------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install system dependencies for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source code and build
COPY . .
RUN npm run build

# ------------------------------
# Runner stage
# ------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install system dependencies in runtime
RUN apt-get update -y && \
    apt-get install -y openssl libssl3 && \
    rm -rf /var/lib/apt/lists/*

# Copy node_modules and dist from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Copy package.json for npm scripts
COPY package*.json ./

# Expose your Nest.js port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]