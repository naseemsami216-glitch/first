const request = require('supertest');
const app = require('../src/app');

describe('API', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready returns 503 when dependencies are down', async () => {
    const res = await request(app).get('/ready');
    expect(res.statusCode).toBe(503);
  });
});
