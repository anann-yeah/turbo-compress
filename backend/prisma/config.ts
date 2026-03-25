export default {
  migrate: {
    databaseUrl: process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/turbocompress?schema=public"
  }
};