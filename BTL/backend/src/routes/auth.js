const express = require('express');
const { run, get, hashPassword } = require('../db');
const { listPermissions } = require('../db/permissions');
const { asyncHandler } = require('../lib/http');
const { signAuthToken, requireAuth } = require('../middleware/auth');
const { toUserResponse } = require('../serializers');
const { normalizeUserPayload } = require('../validators');
const { MANAGEMENT_ROLES, ROLE_LABELS } = require('../config');

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
  res.json({
    ...toUserResponse(user),
    token: signAuthToken(user),
    roleLabel: ROLE_LABELS[user.role] || user.role,
    isManagement: MANAGEMENT_ROLES.includes(user.role),
    permissions: listPermissions(user.role),
  });
}));

// Tra ve thong tin tai khoan dang dang nhap + danh sach quyen (dung de frontend gating).
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({
    id: req.user.id,
    fullName: req.user.fullName,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    roleLabel: ROLE_LABELS[req.user.role] || req.user.role,
    isManagement: MANAGEMENT_ROLES.includes(req.user.role),
    permissions: listPermissions(req.user.role),
  });
}));

module.exports = router;
