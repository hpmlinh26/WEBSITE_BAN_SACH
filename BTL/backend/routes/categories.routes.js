const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const categoriesController = require('../controllers/categories.controller');

const router = express.Router();

router.get('/', asyncHandler(categoriesController.listCategories));
router.post('/', asyncHandler(categoriesController.createCategory));
router.put('/:id', asyncHandler(categoriesController.updateCategory));
router.delete('/:id', asyncHandler(categoriesController.deleteCategory));

module.exports = router;
