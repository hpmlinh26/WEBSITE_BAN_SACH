const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const feedbacksController = require('../controllers/feedbacks.controller');

const router = express.Router();

router.get('/', asyncHandler(feedbacksController.listFeedbacks));
router.post('/', asyncHandler(feedbacksController.createFeedback));
router.patch('/:id/status', asyncHandler(feedbacksController.updateFeedbackStatus));

module.exports = router;
