const { User } = require('../models');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// The admin sets a new password and passes it to the user in person: there is no email delivery
exports.setPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Hashed by the beforeUpdate hook
    user.password = req.body.password;
    await user.save();

    console.log(`Password set by admin #${req.user.id} (${req.user.email}) for user #${user.id} (${user.email})`);
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Не удалось изменить пароль' });
  }
};
