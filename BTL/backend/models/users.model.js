const { run, get, all, hashPassword } = require('../db');

function getAllUsers() {
  return all('SELECT id, full_name, email, phone, role, created_at, updated_at FROM users ORDER BY id DESC');
}

function getUserById(id) {
  return get('SELECT id, full_name, email, phone, role, created_at, updated_at FROM users WHERE id = ?', [id]);
}

function getUserRow(id) {
  return get('SELECT * FROM users WHERE id = ?', [id]);
}

function getUserByAccount(account) {
  return get('SELECT id, full_name, email, phone, role, password_hash FROM users WHERE lower(email) = ? OR phone = ?', [account, account]);
}

async function createUser(payload, roleOverride) {
  const role = roleOverride || payload.role;
  const result = await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [payload.fullName, payload.email, payload.phone, hashPassword(payload.password), role]);
  return getUserById(result.id);
}

async function updateUser(id, payload) {
  await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payload.fullName, payload.email, payload.phone, payload.role, id]);
  return getUserById(id);
}

async function updateUserWithPassword(id, payload) {
  await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payload.fullName, payload.email, payload.phone, payload.role, hashPassword(payload.password), id]);
  return getUserById(id);
}

function deleteUser(id) {
  return run('DELETE FROM users WHERE id = ?', [id]);
}

function countAdmins() {
  return get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserRow,
  getUserByAccount,
  createUser,
  updateUser,
  updateUserWithPassword,
  deleteUser,
  countAdmins
};
