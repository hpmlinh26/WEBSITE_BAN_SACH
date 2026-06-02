const crypto = require('crypto');
const { AUTH_SECRET } = require('../config');
const { get } = require('../db');

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPart(input) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(input).digest('base64url');
}

function signAuthToken(user, maxAgeSeconds = 60 * 60 * 24) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: Number(user.id),
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    })
  );
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${signPart(unsigned)}`;
}

function verifyAuthToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  const expected = signPart(unsigned);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (_) {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const payload = verifyAuthToken(token);
    if (!payload) return res.status(401).json({ message: 'Bạn cần đăng nhập để thực hiện thao tác này.' });
    const user = await get('SELECT id, full_name, email, phone, role FROM users WHERE id = ?', [payload.sub]);
    if (!user) return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' });
    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Bạn không có quyền quản trị.' });
  next();
}

function requireOwnerOrAdmin(getOwnerId) {
  return (req, res, next) => {
    const ownerId = Number(getOwnerId(req));
    if (req.user?.role === 'admin' || Number(req.user?.id) === ownerId) return next();
    return res.status(403).json({ message: 'Bạn không có quyền thao tác dữ liệu này.' });
  };
}

module.exports = { signAuthToken, requireAuth, requireAdmin, requireOwnerOrAdmin };
