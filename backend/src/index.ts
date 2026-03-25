import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Queue } from 'bullmq';
import Stripe from 'stripe';
import * as Minio from 'minio';
import cors from 'cors';
import multer from 'multer';

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } 
});

// --- Infrastructure Configuration (Environment Aware) ---

const connectionString = process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/turbocompress?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
export const prisma = new PrismaClient({ adapter });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', { 
  apiVersion: '2025-01-27.clover' as any 
});

// Use environment variables for CI compatibility
const s3Client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'password123',
});

// Fix: Use REDIS_HOST from environment for GitHub Actions
const scanQueue = new Queue('file-scan', {
  connection: { 
    host: process.env.REDIS_HOST || 'localhost', 
    port: parseInt(process.env.REDIS_PORT || '6379') 
  }
});

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// --- ROUTES ---

app.get('/api/files', async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(files || []);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

app.get('/api/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ error: "File not found" });

    const downloadUrl = await s3Client.presignedGetObject('turbocompress', file.s3Key, 3600);
    res.json({ url: downloadUrl });
  } catch (error) {
    res.status(500).json({ error: "Download link generation failed" });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const userId = req.body.userId || "guest-user-1";
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file" });

    await prisma.user.upsert({
      where: { id: userId },
      update: {}, 
      create: { 
        id: userId, 
        email: `${userId}@example.com`,
        password: "dummy_password", 
      } as any
    });

    const s3Key = `${Date.now()}-${file.originalname}`;
    await s3Client.putObject('turbocompress', s3Key, file.buffer);

    const dbFile = await prisma.file.create({
      data: {
        filename: file.originalname,
        originalSize: Math.round(Number(req.body.originalSize)) || 0,
        compressedSize: Math.round(Number(req.body.compressedSize)) || 0,
        s3Key: s3Key,
        userId: userId,
        status: 'PENDING'
      }
    });

    await scanQueue.add('scan', { fileId: dbFile.id, s3Key });
    res.json(dbFile);
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post('/api/checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { currency: 'inr', product_data: { name: 'Pro' }, unit_amount: 299900 },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/cancel`,
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Stripe failed" });
  }
});

// Cleanup for Jest to avoid "Open Handles" error
export const closeConnections = async () => {
  await prisma.$disconnect();
  await pool.end();
  await scanQueue.close();
};

if (process.env.NODE_ENV !== 'test') {
  app.listen(4000, () => console.log('✅ Backend running on http://localhost:4000'));
}
export default app;