const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { registerRules, loginRules } = require('../middleware/validate');

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', authenticateToken, getMe);

module.exports = router;
