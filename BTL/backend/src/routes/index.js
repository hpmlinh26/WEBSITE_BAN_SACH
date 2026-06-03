const express = require('express');

const router = express.Router();

// Tat ca route API gom o day, mount duoi prefix /api trong app.js.
router.use('/', require('./health'));
router.use('/categories', require('./categories'));
router.use('/products', require('./products'));
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/roles', require('./roles'));
router.use('/cart', require('./cart'));
router.use('/orders', require('./orders'));
router.use('/vouchers', require('./vouchers'));
router.use('/feedbacks', require('./feedbacks'));

module.exports = router;
