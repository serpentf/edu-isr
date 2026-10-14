const express = require('express');
const router = express.Router();
const {
  getProgress,
  updateLessonProgress,
  getCourseProgress,
  submitQuiz,
  getLessonProgress,
  saveChallengeRun,
  saveChecklist
} = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/auth');

router.get('/:userId?', authenticateToken, getProgress);
router.get('/lesson/:lessonId', authenticateToken, getLessonProgress);
router.put('/lesson/:lessonId', authenticateToken, updateLessonProgress);
router.post('/lesson/:lessonId/run', authenticateToken, saveChallengeRun);
router.put('/lesson/:lessonId/checklist', authenticateToken, saveChecklist);
router.post('/lesson/:lessonId/quiz', authenticateToken, submitQuiz);
router.get('/course/:courseId', authenticateToken, getCourseProgress);

module.exports = router;
