const { DB_PATH } = require('../db');

function getHealth(req, res) {
  res.json({ ok: true, message: 'Backend MOT.vn đang chạy', database: DB_PATH, time: new Date().toISOString() });
}

module.exports = { getHealth };
