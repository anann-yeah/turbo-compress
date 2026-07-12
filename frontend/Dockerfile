FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend code and build for production
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
