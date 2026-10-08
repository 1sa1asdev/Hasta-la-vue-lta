FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY client/package.json ./client/
COPY shared/package.json ./shared/

RUN npm ci --workspace=client

COPY client ./client
COPY shared ./shared

WORKDIR /app/client

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3001"]