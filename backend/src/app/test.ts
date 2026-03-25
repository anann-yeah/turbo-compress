import { jest, describe, it, expect } from '@jest/globals';
import request from 'supertest';

// 1. MOCK PRISMA: This stops it from looking for the "File" table
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      file: {
        findMany: jest.fn().mockResolvedValue([]), // Returns empty array instantly
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
  };
});

// Import app AFTER the mock
import app from '../index.js'; 

describe('Backend Smoke Test', () => {
  it('should return 200 OK from the files endpoint', async () => {
    const response = await request(app).get('/api/files');
    
    // This will now be 200 because Prisma won't throw the "Table not found" error
    expect(response.status).toBe(200); 
    expect(Array.isArray(response.body)).toBe(true);
  });
});