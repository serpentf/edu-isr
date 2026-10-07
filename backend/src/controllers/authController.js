const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const EMAIL_TAKEN = 'Пользователь с таким email уже зарегистрирован';

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: EMAIL_TAKEN, fields: { email: EMAIL_TAKEN } });
    }

    const user = await User.create({ email, password, name });
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    // Two simultaneous registrations with the same email pass the check above
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: EMAIL_TAKEN, fields: { email: EMAIL_TAKEN } });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Не удалось зарегистрироваться, попробуйте позже' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Аккаунт деактивирован' });
    }

    const token = generateToken(user);
    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Не удалось войти, попробуйте позже' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};
