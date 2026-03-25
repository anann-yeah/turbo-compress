import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
// Import your app/express instance
import app from '../index'; // Added an extra dot to go "up" one folder 

describe('Backend Smoke Test', () => {
  it('should return 200 OK from the files endpoint', async () => {
    const response = await request(app).get('/api/files');
    // We expect a 200 even if the array is empty
    expect(response.status).toBe(200); 
  }, 5000);
});