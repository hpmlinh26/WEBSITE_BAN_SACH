const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const productsController = require('../controllers/products.controller');

const router = express.Router();

router.get('/', asyncHandler(productsController.listProducts));
router.get('/:id', asyncHandler(productsController.getProduct));
router.post('/', asyncHandler(productsController.createProduct));
router.put('/:id', asyncHandler(productsController.updateProduct));
router.delete('/:id', asyncHandler(productsController.deleteProduct));

module.exports = router;
