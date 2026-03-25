import request from 'supertest';
import { describe, it, expect, afterAll } from '@jest/globals';
import app, { closeConnections } from '../index'; 

describe('Backend Smoke Test', () => {
  it('should return 200 OK from the files endpoint', async () => {
    const response = await request(app).get('/api/files');
    expect(response.status).toBe(200); 
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Critical: Close connections so the test actually finishes
  afterAll(async () => {
    await closeConnections();
  });
});