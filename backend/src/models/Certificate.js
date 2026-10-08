const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Certificate = sequelize.define('Certificate', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  // Public verification code printed on the certificate: XXXX-XXXX-XXXX
  code: {
    type: DataTypes.STRING(14),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  course_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  // Entered once when the certificate is issued; the profile name may be a nickname
  full_name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  // Average score of the course quizzes, percent
  score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  revoke_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['user_id', 'course_id'], unique: true }
  ]
});

module.exports = Certificate;
