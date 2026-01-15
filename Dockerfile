FROM node:20-bookworm-slim AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Generate Prisma client for Data Proxy inside the container
RUN npx prisma generate --data-proxy

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]