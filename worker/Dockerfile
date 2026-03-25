FROM node:20-alpine

# Install openssl and libc compatibility
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy prisma folder specifically BEFORE generating
COPY prisma ./prisma/

# Catch build arguments for CI
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

# Generate the client
RUN npx prisma generate

COPY . .
CMD ["npm", "run", "dev"]