FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN PRISMA_CLI_QUERY_ENGINE_TYPE=binary npx prisma generate
CMD ["npm", "run dev"]