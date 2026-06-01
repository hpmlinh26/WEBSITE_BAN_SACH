const express = require('express');
const { run, get, hashPassword } = require('../db');
const { asyncHandler } = require('../lib/http');
const { toUserResponse } = require('../serializers');
const { normalizeUserPayload } = require('../validators');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
  const user = normalizeUserPayload(req.body);
  const result = await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [user.fullName, user.email, user.phone, hashPassword(user.password), 'customer']);
  res.status(201).json({ id: result.id, fullName: user.fullName, email: user.email, phone: user.phone, role: 'customer' });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.phone || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const user = await get('SELECT id, full_name, email, phone, role, password_hash FROM users WHERE lower(email) = ? OR phone = ?', [account, account]);
  if (!user || user.password_hash !== hashPassword(password)) return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });
  res.json(toUserResponse(user));
}));

module.exports = router;
