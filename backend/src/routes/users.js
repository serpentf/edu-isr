const express = require('express');
const router = express.Router();
const { getUsers, getUserById, setPassword } = require('../controllers/usersController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { setPasswordRules } = require('../middleware/validate');

router.get('/', authenticateToken, authorizeRole('admin'), getUsers);
router.get('/:id', authenticateToken, getUserById);
router.put('/:id/password', authenticateToken, authorizeRole('admin'), setPasswordRules, setPassword);

module.exports = router;
