import { jest, describe, it, expect } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// 1. MOCK PRISMA: This stops it from looking for the "File" table
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      file: {
        // We cast the mock function to 'any' to bypass the 'never' check
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
  };
});

// Import app AFTER the mock
import app from '../index.js';
import { JWT_SECRET } from '../middleware/auth.js';

const authToken = jwt.sign({ userId: 'test-user-id' }, JWT_SECRET);

describe('Backend Smoke Test', () => {
  it('should return 200 OK from the files endpoint', async () => {
    const response = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${authToken}`);

    // This will now be 200 because Prisma won't throw the "Table not found" error
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should reject unauthenticated requests', async () => {
    const response = await request(app).get('/api/files');
    expect(response.status).toBe(401);
  });
});