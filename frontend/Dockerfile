FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm install

# 2. Copy the rest of the frontend code
COPY . .

# 3. Next.js Build 
# (Note: If you are using 'npm run dev' inside Docker, you can skip 'npm run build')
# RUN npm run build

EXPOSE 3000

# 4. Start the development server
CMD ["npm", "run", "dev"]