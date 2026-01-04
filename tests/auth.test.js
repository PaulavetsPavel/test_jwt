const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const app = require('../server'); // ВАЖНО: server.js должен экспортировать app

const USERS_FILE = path.join(__dirname, '../data/users.json');

beforeEach(() => {
  // Очистка пользователей перед каждым тестом
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
});

describe('Auth API', () => {
  let accessToken;
  let refreshToken;
  const deviceId = 'test-device';

  test('POST /api/auth/register — регистрация пользователя', async () => {
    const res = await request(app).post('/api/auth/register').set('x-device-id', deviceId).send({
      username: 'testuser',
      password: 'password123',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.username).toBe('testuser');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  test('POST /api/auth/login — вход пользователя', async () => {
    // сначала регистрируем
    await request(app).post('/api/auth/register').set('x-device-id', deviceId).send({
      username: 'testuser',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/login').set('x-device-id', deviceId).send({
      username: 'testuser',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('GET /api/auth/me — доступ к защищённому маршруту', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('x-device-id', deviceId)
      .send({
        username: 'testuser',
        password: 'password123',
      });

    accessToken = registerRes.body.accessToken;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.deviceId).toBe(deviceId);
  });

  test('POST /api/auth/refresh — обновление токена', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('x-device-id', deviceId)
      .send({
        username: 'testuser',
        password: 'password123',
      });

    refreshToken = registerRes.body.refreshToken;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('x-device-id', deviceId)
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('GET /api/auth/me — отказ без токена', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});
