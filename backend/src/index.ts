import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Queue } from 'bullmq';
import Stripe from 'stripe';
import * as Minio from 'minio';
import cors from 'cors';

// Set up the Prisma Postgres Adapter
const connectionString = process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/turbocompress?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any); // <-- Adding "as any" fixes the ts(2345) error

const app = express();
const prisma = new PrismaClient({ adapter }); // Pass the adapter here!
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', { apiVersion: '2026-02-25.clover' });
// S3/MinIO Client
const s3Client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'password123',
});

// Redis Queue for Background Worker
const scanQueue = new Queue('file-scan', {
  connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 }
});

app.use(cors());
app.use(express.json()); // Use raw body for Stripe webhook in production

// 1. Stripe Checkout (Lifetime Pro - INR)
app.post('/api/checkout', async (req, res) => {
  const { userId } = req.body; // In production, extract from JWT
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'inr',
        product_data: { name: 'TurboCompress Lifetime Pro', description: 'Unlimited WASM Compressions' },
        unit_amount: 299900, // ₹2999.00
      },
      quantity: 1,
    }],
    mode: 'payment', // One-time payment bypasses RBI recurring mandates
    success_url: `http://localhost:3000/dashboard?success=true`,
    cancel_url: `http://localhost:3000/dashboard?canceled=true`,
    client_reference_id: userId,
  });
  
  res.json({ url: session.url });
});

// 2. Stripe Webhook (Fulfill Pro Status)
app.post('/api/webhook', async (req, res) => {
  const event = req.body; // Verify signature in production
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await prisma.user.update({
      where: { id: session.client_reference_id },
      data: { isPro: true }
    });
  }
  res.status(200).end();
});

// 3. Initiate Upload & Queue Scan
app.post('/api/files', async (req, res) => {
  const { filename, originalSize, compressedSize, s3Key, userId } = req.body;
  
  const file = await prisma.file.create({
    data: { filename, originalSize, compressedSize, s3Key, userId, status: 'UPLOADING' }
  });

  // Generate Presigned URL for direct S3 upload from client
  const uploadUrl = await s3Client.presignedPutObject('turbocompress', s3Key, 60 * 60);

  // Queue background scan
  await scanQueue.add('scan', { fileId: file.id, s3Key }, { delay: 5000 }); // Simulate post-upload

  res.json({ file, uploadUrl });
});

app.listen(4000, () => console.log('Backend running on port 4000'));