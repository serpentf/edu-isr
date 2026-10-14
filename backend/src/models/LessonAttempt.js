const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Every attempt: a quiz submission, a DevTools lab check or a run of challenge tests.
// UserProgress keeps the best result; this table keeps the history.
const LessonAttempt = sequelize.define('LessonAttempt', {
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
  kind: {
    type: DataTypes.ENUM('quiz', 'lab', 'challenge'),
    allowNull: false
  },
  // Percent: quiz score, the share of correct lab answers or of caught challenge bugs
  score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  // Quiz: { answers, results: [bool] }; lab: { results: [{ key, correct }] };
  // challenge: { tests, tests_passed, caught: [bool] }
  details: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['lesson_id'] },
    { fields: ['user_id', 'lesson_id'] }
  ]
});

module.exports = LessonAttempt;
