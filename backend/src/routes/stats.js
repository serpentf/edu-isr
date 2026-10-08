const express = require('express');
const router = express.Router();
const { coursesOverview, courseStats, studentStats } = require('../controllers/statsController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Every statistics endpoint is admin-only
router.use(authenticateToken, authorizeRole('admin'));

router.get('/courses', coursesOverview);
router.get('/courses/:courseId', courseStats);
router.get('/courses/:courseId/students/:userId', studentStats);

module.exports = router;
