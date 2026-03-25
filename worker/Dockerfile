FROM node:20-alpine

# 1. Install openssl and libc compatibility for Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 2. Copy package files
COPY package*.json ./

# 3. Install dependencies
RUN npm install

# 4. Catch the build argument for the database URL
# This prevents the "Exit Code 1" during the generate phase in CI
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 5. Copy the prisma folder from the worker directory
# (Ensure your worker folder has its own prisma/schema.prisma)
COPY prisma ./prisma/

# 6. Generate the Prisma Client with the binary engine
RUN PRISMA_CLI_QUERY_ENGINE_TYPE=binary npx prisma generate

# 7. Copy the rest of the worker code
COPY . .

# 8. Start the worker (using 'dev' for now as per your setup)
CMD ["npm", "run", "dev"]