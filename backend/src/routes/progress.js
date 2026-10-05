const express = require('express');
const router = express.Router();
const {
  getProgress,
  updateLessonProgress,
  getCourseProgress
} = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/auth');

router.get('/:userId?', authenticateToken, getProgress);
router.put('/lesson/:lessonId', authenticateToken, updateLessonProgress);
router.get('/course/:courseId', authenticateToken, getCourseProgress);

module.exports = router;
