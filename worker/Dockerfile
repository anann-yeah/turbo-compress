FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

RUN npx prisma generate

COPY . .
CMD ["npm", "run", "dev"]