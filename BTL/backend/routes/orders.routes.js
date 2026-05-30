const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const ordersController = require('../controllers/orders.controller');

const router = express.Router();

router.get('/', asyncHandler(ordersController.listOrders));
router.get('/:id', asyncHandler(ordersController.getOrderDetails));
router.post('/', asyncHandler(ordersController.createOrder));
router.patch('/:id/status', asyncHandler(ordersController.updateOrderStatus));
router.delete('/:id', asyncHandler(ordersController.deleteOrder));

module.exports = router;
