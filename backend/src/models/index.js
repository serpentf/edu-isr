const User = require('./User');
const Course = require('./Course');
const Module = require('./Module');
const Lesson = require('./Lesson');
const UserProgress = require('./UserProgress');

// Associations
User.hasMany(UserProgress, { foreignKey: 'user_id', as: 'progress' });

Course.hasMany(Module, { foreignKey: 'course_id', as: 'modules', order: [['order_index', 'ASC']]});
Module.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

Module.hasMany(Lesson, { foreignKey: 'module_id', as: 'lessons', order: [['order_index', 'ASC']]});
Lesson.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });

User.hasMany(UserProgress, { foreignKey: 'user_id', as: 'progress' });
UserProgress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserProgress.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

Course.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = {
  User,
  Course,
  Module,
  Lesson,
  UserProgress
};
