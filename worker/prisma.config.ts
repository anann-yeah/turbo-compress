import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://admin:password123@localhost:5432/turbocompress?schema=public',
  },
});
