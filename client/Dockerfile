# ---------- Build stage ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY shared/package.json ./shared/

RUN npm ci --workspace=client

COPY client ./client
COPY shared ./shared

WORKDIR /app/client
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
