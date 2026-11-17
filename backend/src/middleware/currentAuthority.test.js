jest.mock('../config/db', () => ({ query: jest.fn() }));

const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('./auth');
const optionalAuth = require('./optionalAuth');
const socketAuth = require('./socketAuth');

const SECRET = 'local-test-secret';
process.env.JWT_SECRET = SECRET;

const tokenFor = (claims = { id: 7 }) => jwt.sign(claims, SECRET, { expiresIn: '1h' });
const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

beforeEach(() => {
  pool.query.mockReset();
});

describe('current account authority', () => {
  test('required HTTP auth attaches current database role, not stale token claims', async () => {
    pool.query.mockResolvedValue([[{ id: 7, email: 'fixture@example.test', name: 'Fixture', role: 'ads_analyst', status: 'active' }]]);
    const req = { headers: { authorization: `Bearer ${tokenFor({ id: 7, role: 'admin' })}` } };
    const res = response();
    const next = jest.fn();

    await auth(req, res, next);

    expect(req.user.role).toBe('ads_analyst');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('required HTTP auth rejects a blocked account', async () => {
    pool.query.mockResolvedValue([[{ id: 7, email: 'fixture@example.test', name: 'Fixture', role: 'user', status: 'blocked' }]]);
    const req = { headers: { authorization: `Bearer ${tokenFor()}` } };
    const res = response();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('optional auth rejects invalid bearer instead of falling through to guest authority', async () => {
    const req = { headers: { authorization: 'Bearer invalid', 'x-guest-token': '00000000-0000-4000-8000-000000000001' }, query: {} };
    const res = response();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('optional auth permits anonymous requests without querying a user', async () => {
    const req = { headers: {}, query: {} };
    const res = response();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('socket auth accepts a normal login JWT after current admin lookup', async () => {
    pool.query.mockResolvedValue([[{ id: 7, email: 'fixture@example.test', name: 'Fixture Admin', role: 'admin', status: 'active' }]]);
    const socket = { handshake: { auth: { token: tokenFor() }, query: {} } };
    const next = jest.fn();

    await socketAuth(socket, next);

    expect(socket.userId).toBe(7);
    expect(socket.userRole).toBe('admin');
    expect(socket.userName).toBe('Fixture Admin');
    expect(next).toHaveBeenCalledWith();
  });

  test('socket auth rejects blocked administrators', async () => {
    pool.query.mockResolvedValue([[{ id: 7, email: 'fixture@example.test', name: 'Fixture Admin', role: 'admin', status: 'blocked' }]]);
    const socket = { handshake: { auth: { token: tokenFor() }, query: {} } };
    const next = jest.fn();

    await socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin access required' }));
  });
});
