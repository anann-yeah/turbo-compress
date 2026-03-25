FROM node:20-alpine

# 1. CRITICAL: Alpine needs libc6-compat for Prisma's binary engine to run
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

# 2. CRITICAL: Prisma needs the schema file BEFORE generating
COPY prisma ./prisma/

# 3. CRITICAL: Catch the dummy URL from the CI pipeline
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 4. Generate the client
RUN PRISMA_CLI_QUERY_ENGINE_TYPE=binary npx prisma generate

COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]