const User = require('./User');
const Course = require('./Course');
const Module = require('./Module');
const Lesson = require('./Lesson');
const UserProgress = require('./UserProgress');
const Certificate = require('./Certificate');

// Associations
User.hasMany(UserProgress, { foreignKey: 'user_id', as: 'progress' });

Course.hasMany(Module, { foreignKey: 'course_id', as: 'modules', order: [['order_index', 'ASC']]});
Module.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

Module.hasMany(Lesson, { foreignKey: 'module_id', as: 'lessons', order: [['order_index', 'ASC']]});
Lesson.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
UserProgress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserProgress.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

Course.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Certificate.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Certificate.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
User.hasMany(Certificate, { foreignKey: 'user_id', as: 'certificates' });

module.exports = {
  User,
  Course,
  Module,
  Lesson,
  UserProgress,
  Certificate
};
