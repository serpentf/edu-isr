const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProgress = sequelize.define('UserProgress', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  lesson_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  is_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  quiz_score: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  code_submission: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['user_id', 'lesson_id'], unique: true }
  ]
});

module.exports = UserProgress;
