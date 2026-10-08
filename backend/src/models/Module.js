const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Module = sequelize.define('Module', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  course_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // Stable key from the course folder (folder name without the order prefix);
  // scripts/update-course.js matches modules by it
  source_key: {
    type: DataTypes.STRING(150),
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['course_id'] },
    { fields: ['course_id', 'order_index'] }
  ]
});

module.exports = Module;
