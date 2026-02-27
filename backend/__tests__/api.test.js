const request = require('supertest');
const app = require('../src/app');

// Mock database
jest.mock('../src/database/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { connect: jest.fn(), end: jest.fn() },
}));

// Silence logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(), warn: jest.fn(),
}));

const { query } = require('../src/database/db');

// bcrypt hash of 'password' with cost 10 - verified stable hash
const VALID_USER = {
  id: 'user-uuid-1',
  name: 'Admin User',
  email: 'admin@test.com',
  password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  role: 'admin',
  is_active: true,
  avatar_url: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test_secret_key_for_jest_at_least_32_chars';
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'valid@test.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for non-existent user', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for wrong password', async () => {
    query.mockResolvedValueOnce({ rows: [VALID_USER] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 200 with token for correct credentials', async () => {
    query
      .mockResolvedValueOnce({ rows: [VALID_USER] })  // SELECT user
      .mockResolvedValueOnce({ rows: [] });             // UPDATE last_login_at
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });
});

// ── GET /api/health ───────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with ok status when db is up', async () => {
    query.mockResolvedValueOnce({ rows: [{ result: 1 }] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('version');
  });

  it('returns 503 when database is unavailable', async () => {
    query.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// ── Protected routes ──────────────────────────────────────────────────────────
describe('Protected routes return 401 without token', () => {
  const routes = [
    ['get', '/api/products'],
    ['get', '/api/orders'],
    ['get', '/api/customers'],
    ['get', '/api/dashboard'],
  ];

  test.each(routes)('%s %s', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.status).toBe(404);
  });
});
