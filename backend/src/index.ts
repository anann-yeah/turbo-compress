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

// Configure Multer for memory storage (handles file buffers)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

// --- Database & Infrastructure Setup ---

const connectionString = process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/turbocompress?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
export const prisma = new PrismaClient({ adapter });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', { 
  apiVersion: '2025-01-27.clover' as any 
});

const s3Client = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'password123',
});

const scanQueue = new Queue('file-scan', {
  connection: { host: 'localhost', port: 6379 }
});

// --- Middleware ---

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// --- ROUTES ---

/**
 * 1. GET ALL FILES
 * Used by the Dashboard to list uploads
 */
app.get('/api/files', async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(files);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

/**
 * 2. UPLOAD & COMPRESS PIPELINE
 * Receives the compressed file from the frontend
 */
// Add this under your other routes in index.ts
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // 1. Find the file in the Database
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ error: "File record not found" });
    }

    // 2. Generate a Presigned URL from MinIO (valid for 1 hour)
    // 'turbocompress' is your bucket name
    const downloadUrl = await s3Client.presignedGetObject(
      'turbocompress', 
      file.s3Key, 
      3600 
    );

    // 3. Send the URL to the frontend
    res.json({ url: downloadUrl });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Could not generate download link" });
  }
});
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalSize, compressedSize } = req.body;
    const userId = req.body.userId || "guest-user-1";
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Ensure User exists in DB before attaching a file (Fixes P2003)
   // backend/src/index.ts - Line 85
await prisma.user.upsert({
  where: { id: userId },
  update: {}, 
  create: { 
    id: userId, 
    email: `${userId}@example.com`,
    password: "dummy_password_for_now", // Added this to satisfy Prisma
  } as any // The "as any" tells TypeScript to stop complaining about missing fields
});

    const s3Key = `${Date.now()}-${file.originalname}`;
    
    // 1. Upload to MinIO Storage
    await s3Client.putObject('turbocompress', s3Key, file.buffer);

    // 2. Save metadata to Database (Fixes String vs Int mismatch)
    // backend/src/index.ts - Inside the upload route
// In index.ts
// Replace your prisma.file.create block with this:
const dbFile = await prisma.file.create({
  data: {
    filename: file.originalname,
    // Use Number() to ensure it's treated as a numeric value
    originalSize: Math.round(Number(req.body.originalSize)) || 0,
    compressedSize: Math.round(Number(req.body.compressedSize)) || 0,
    s3Key: s3Key,
    userId: userId,
    status: 'PENDING'
  }
});

    // 3. Queue for background scanning/processing
    await scanQueue.add('scan', { fileId: dbFile.id, s3Key });

    res.json(dbFile);
  } catch (error) {
    console.error("DETAILED UPLOAD ERROR:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
  }
});

/**
 * 3. STRIPE CHECKOUT
 */
app.post('/api/checkout', async (req, res) => {
  try {
    const userId = req.body.userId || "guest-user-1";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: 'TurboCompress Lifetime Pro' },
          unit_amount: 299900,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:3000/dashboard?success=true`,
      cancel_url: `http://localhost:3000/dashboard?canceled=true`,
      client_reference_id: userId,
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Stripe session failed" });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(4000, () => console.log('✅ Backend running on http://localhost:4000'));
}
export default app;