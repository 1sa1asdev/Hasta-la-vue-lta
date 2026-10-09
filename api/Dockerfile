FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY api/package.json ./api/
COPY shared/package.json ./shared/

RUN npm ci --workspace=api --omit=dev

COPY api ./api
COPY shared ./shared

WORKDIR /app/api

EXPOSE 3000

CMD ["node", "src/index.js"]