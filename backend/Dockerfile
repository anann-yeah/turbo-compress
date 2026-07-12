FROM node:20-alpine

# Install libraries Prisma needs for Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the code (needs prisma.config.ts at the package root,
# which prisma generate reads for datasource info)
COPY . .

ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
