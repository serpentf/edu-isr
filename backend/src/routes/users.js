const express = require('express');
const router = express.Router();
const { getUsers, getUserById } = require('../controllers/usersController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/', authenticateToken, authorizeRole('admin'), getUsers);
router.get('/:id', authenticateToken, getUserById);

module.exports = router;
