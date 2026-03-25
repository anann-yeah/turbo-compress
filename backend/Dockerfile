FROM node:20-alpine
# Install openssl and libc compatibility for Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
COPY package*.json ./
RUN npm install

# 1. Catch the build argument
ARG DATABASE_URL
# 2. Set it as an environment variable so Prisma can see it
ENV DATABASE_URL=$DATABASE_URL

# 3. Explicitly copy prisma folder before generating
COPY prisma ./prisma/

RUN PRISMA_CLI_QUERY_ENGINE_TYPE=binary npx prisma generate

COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]