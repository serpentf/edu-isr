const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { registerRules, loginRules } = require('../middleware/validate');
const { loginLimiter, loginFailedLimiter, registerLimiter } = require('../middleware/rateLimit');

router.post('/register', registerLimiter, registerRules, register);
router.post('/login', loginLimiter, loginFailedLimiter, loginRules, login);
router.get('/me', authenticateToken, getMe);

module.exports = router;
