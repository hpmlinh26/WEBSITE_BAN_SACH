const express = require('express');
const { DB_PATH } = require('../db');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Backend MOT.vn đang chạy', database: DB_PATH, time: new Date().toISOString() });
});

module.exports = router;
