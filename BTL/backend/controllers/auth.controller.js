const { hashPassword } = require('../db');
const usersModel = require('../models/users.model');
const { normalizeUserPayload, toUserResponse } = require('../helpers');

async function register(req, res) {
  const payload = normalizeUserPayload(req.body);
  const created = await usersModel.createUser(payload, 'customer');
  res.status(201).json({ id: created.id, fullName: created.full_name, email: created.email, phone: created.phone, role: created.role });
}

async function login(req, res) {
  const account = String(req.body.account || req.body.email || req.body.phone || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const user = await usersModel.getUserByAccount(account);
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });
  }
  res.json(toUserResponse(user));
}

module.exports = { register, login };
