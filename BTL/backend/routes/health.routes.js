const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/health', asyncHandler(healthController.getHealth));

module.exports = router;
