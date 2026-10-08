const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getStatus,
  issue,
  getMine,
  verify,
  list,
  revoke
} = require('../controllers/certificatesController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const fullNameRules = [
  body('full_name')
    .isString().withMessage('Введите имя и фамилию')
    .trim()
    .isLength({ min: 3, max: 150 }).withMessage('Имя для сертификата — от 3 до 150 символов'),
  handleValidation
];

// Public verification
router.get('/verify/:code', verify);

// Student
router.get('/mine', authenticateToken, getMine);
router.get('/course/:courseId/status', authenticateToken, getStatus);
router.post('/course/:courseId', authenticateToken, fullNameRules, issue);

// Admin
router.get('/', authenticateToken, authorizeRole('admin'), list);
router.post('/:id/revoke', authenticateToken, authorizeRole('admin'), revoke);

module.exports = router;
