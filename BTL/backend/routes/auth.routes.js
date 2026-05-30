const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));

module.exports = router;
