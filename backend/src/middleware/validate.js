const { body, validationResult } = require('express-validator');

// Responds 400 with the first error message and per-field messages for the form
const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields = {};
  for (const error of result.array()) {
    if (!fields[error.path]) fields[error.path] = error.msg;
  }
  return res.status(400).json({ error: Object.values(fields)[0], fields });
};

const email = body('email')
  .trim()
  .toLowerCase()
  .isEmail().withMessage('Введите корректный email')
  .isLength({ max: 255 }).withMessage('Email слишком длинный');

const registerRules = [
  email,
  body('password')
    .isString().withMessage('Введите пароль')
    .isLength({ min: 8 }).withMessage('Пароль должен быть не короче 8 символов')
    .isLength({ max: 72 }).withMessage('Пароль должен быть не длиннее 72 символов'),
  body('name')
    .isString().withMessage('Введите имя')
    .trim()
    .notEmpty().withMessage('Введите имя')
    .isLength({ max: 100 }).withMessage('Имя должно быть не длиннее 100 символов'),
  handleValidation
];

// Login checks presence only: password rules may have changed since the account was created
const loginRules = [
  email,
  body('password').isString().notEmpty().withMessage('Введите пароль'),
  handleValidation
];

module.exports = { registerRules, loginRules };
