# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install
COPY . .
RUN npm run build

# --- Runtime Stage ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .

# Copy custom entrypoint for env injection
COPY ./env-inject.sh /docker-entrypoint.d/env-inject.sh
RUN chmod +x /docker-entrypoint.d/env-inject.sh

# Copy default nginx config (optional, can be customized)
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 