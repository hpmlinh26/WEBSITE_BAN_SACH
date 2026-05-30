const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const vouchersController = require('../controllers/vouchers.controller');

const router = express.Router();

router.get('/', asyncHandler(vouchersController.listVouchers));
router.post('/', asyncHandler(vouchersController.createVoucher));
router.put('/:id', asyncHandler(vouchersController.updateVoucher));
router.delete('/:id', asyncHandler(vouchersController.deleteVoucher));
router.post('/apply', asyncHandler(vouchersController.applyVoucher));

module.exports = router;
