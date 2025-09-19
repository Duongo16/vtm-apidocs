# ---- Build stage -----------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build the production bundle
COPY . .
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
ENV NODE_ENV=production

# Copy compiled assets from the build stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with SPA-friendly setup
RUN rm /etc/nginx/conf.d/default.conf \
  && cat <<'NGINX_CONF' > /etc/nginx/conf.d/app.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
NGINX_CONF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
