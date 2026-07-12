FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
RUN npx prisma generate
RUN npm run build

CMD ["npm", "start"]
