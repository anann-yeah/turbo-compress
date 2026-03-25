FROM node:20-alpine

# Install libraries Prisma needs for Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# COPY THE PRISMA FOLDER BEFORE GENERATING
COPY prisma ./prisma/

# Set these for the build process
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

# Run the generator
RUN npx prisma generate

# Copy the rest of the code
COPY . .

EXPOSE 4000
CMD ["npm", "run", "dev"]