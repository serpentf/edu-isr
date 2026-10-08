const express = require('express');
const router = express.Router();
const { getState, getReviews, check } = require('../controllers/labsController');
const { authenticateToken } = require('../middleware/auth');

// Clues are per student, so every lab endpoint requires a logged-in user
router.use(authenticateToken);

router.get('/:lessonId/state', getState);
router.get('/:lessonId/reviews', getReviews);
router.post('/:lessonId/check', check);

module.exports = router;
