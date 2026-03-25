FROM node:20-alpine
# Install openssl because Prisma needs it to run on Alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Tell Prisma to generate for the correct architecture
RUN PRISMA_CLI_QUERY_ENGINE_TYPE=binary npx prisma generate
EXPOSE 4000
CMD ["npm", "run dev"]