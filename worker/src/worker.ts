import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const worker = new Worker('file-scan', async job => {
  const { fileId, s3Key } = job.data;
  console.log(`[Worker] Scanning file: ${s3Key}`);

  // Update status to SCANNING
  await prisma.file.update({
    where: { id: fileId },
    data: { status: 'SCANNING' }
  });

  // Simulate Virus Scan latency (ClamAV/YARA logic goes here)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Update status to SAFE
  await prisma.file.update({
    where: { id: fileId },
    data: { status: 'SAFE' }
  });

  console.log(`[Worker] Scan complete. File ${s3Key} is SAFE.`);
}, {
  connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 }
});

worker.on('completed', job => console.log(`Job ${job.id} completed.`));
worker.on('failed', (job, err) => console.log(`Job failed: ${err.message}`));