const express = require('express');
const { run, get, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ.' });
  }
  const existing = await get('SELECT id FROM newsletter_subscribers WHERE email = ?', [email]);
  if (existing) return res.status(200).json({ message: 'Email đã được đăng ký trước đó.', alreadyExists: true });
  await run('INSERT INTO newsletter_subscribers(email) VALUES (?)', [email]);
  res.status(201).json({ message: 'Đăng ký nhận tin thành công!' });
}));

router.get('/', requireAuth, requirePermission('newsletter', 'view'), asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM newsletter_subscribers ORDER BY id DESC');
  res.json(rows.map((r) => ({ id: r.id, email: r.email, createdAt: r.created_at })));
}));

module.exports = router;
