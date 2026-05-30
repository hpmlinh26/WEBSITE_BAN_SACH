const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.get('/:userId', asyncHandler(cartController.getCart));
router.post('/', asyncHandler(cartController.addToCart));
router.patch('/:id', asyncHandler(cartController.updateCartItem));
router.delete('/:id', asyncHandler(cartController.deleteCartItem));
router.delete('/by-user/:userId', asyncHandler(cartController.clearCart));

module.exports = router;
