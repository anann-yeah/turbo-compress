FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# We provide a dummy URL just for the generation step
RUN DATABASE_URL="postgresql://localhost:5432/dummy" npx prisma generate
CMD ["npm", "run", "dev"]