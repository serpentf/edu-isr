const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseById,
  getCourseBySlug,
  getLessonById,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/coursesController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Public routes
router.get('/', getCourses);
router.get('/slug/:slug', getCourseBySlug);
router.get('/lessons/:lessonId', getLessonById);

// Protected routes
router.get('/:id', getCourseById);

// Admin routes
router.post('/', authenticateToken, authorizeRole('admin'), createCourse);
router.put('/:id', authenticateToken, authorizeRole('admin'), updateCourse);
router.delete('/:id', authenticateToken, authorizeRole('admin'), deleteCourse);

module.exports = router;
