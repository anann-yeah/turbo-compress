import dns from 'node:dns';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Queue } from 'bullmq';
import Stripe from 'stripe';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import cors from 'cors';
import multer from 'multer';

// This runs on an EC2 host with no public IPv4 (cost reasons). Dualstack
// hostnames (S3, Stripe) resolve to both A and AAAA records, and Node's
// default resolution order can pick the (unreachable) IPv4 address first,
// hanging until TCP timeout instead of falling back to IPv6.
dns.setDefaultResultOrder('ipv6first');

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } 
});

// --- Infrastructure Configuration (Environment Aware) ---

const connectionString = process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/turbocompress?schema=public";
const pool = new Pool({
  connectionString,
  // RDS enforces SSL (rds.force_ssl=1); pg doesn't negotiate it by default
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool as any);
export const prisma = new PrismaClient({ adapter });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', { 
  apiVersion: '2025-01-27.clover' as any 
});

// S3_ENDPOINT set => local MinIO (dev). Unset => real AWS S3, creds from the
// EC2 instance role (no static keys needed in prod).
const S3_BUCKET = process.env.S3_BUCKET || 'turbocompress';
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  ...(process.env.S3_ENDPOINT
    ? {
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
          secretAccessKey: process.env.MINIO_SECRET_KEY || 'password123',
        },
      }
    // This EC2 instance has no public IPv4 (cost reasons), so the default
    // S3 endpoint (IPv4-only) is unreachable and PutObject/GetObject just
    // hang until timeout. The dualstack endpoint has AAAA records.
    : { useDualstackEndpoint: true }),
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

    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: file.s3Key }),
      { expiresIn: 3600 }
    );
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
      },
    });

    const s3Key = `${Date.now()}-${file.originalname}`;
    await s3Client.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: file.buffer })
    );

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