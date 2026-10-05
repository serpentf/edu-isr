const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  module_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'video', 'quiz', 'code_challenge'),
    defaultValue: 'text'
  },
  video_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quiz_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  code_challenge_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  indexes: [
    { fields: ['module_id'] },
    { fields: ['module_id', 'order_index'] }
  ]
});

module.exports = Lesson;
