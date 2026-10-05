const { UserProgress, Lesson, Course } = require('../models');

exports.getProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const targetUserId = req.user.role === 'admin' ? parseInt(userId) : currentUserId;

    const progress = await UserProgress.findAll({
      where: { user_id: targetUserId },
      include: [{
        model: Lesson,
        as: 'lesson',
        attributes: ['id', 'title'],
        include: [{
          model: require('../models').Module,
          as: 'module',
          attributes: ['id', 'title'],
          include: [{
            model: require('../models').Course,
            as: 'course',
            attributes: ['id', 'title', 'slug']
          }]
        }]
      }],
      order: [['completed_at', 'DESC']]
    });

    const stats = {
      total_lessons: progress.length,
      completed: progress.filter(p => p.is_completed).length,
      completion_rate: progress.length > 0
        ? (progress.filter(p => p.is_completed).length / progress.length * 100).toFixed(2)
        : 0
    };

    res.json({ progress, stats });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

exports.updateLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { is_completed, quiz_score, code_submission } = req.body;
    const userId = req.user.id;

    let progress = await UserProgress.findOne({
      where: { user_id: userId, lesson_id: lessonId }
    });

    const data = {
      user_id: userId,
      lesson_id: lessonId,
      is_completed: is_completed || false,
      completed_at: is_completed ? new Date() : null
    };

    if (quiz_score !== undefined) data.quiz_score = quiz_score;
    if (code_submission !== undefined) data.code_submission = code_submission;

    if (progress) {
      progress = await progress.update(data);
    } else {
      progress = await UserProgress.create(data);
    }

    res.json(progress);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await require('../models').Course.findByPk(courseId, {
      include: [{
        model: require('../models').Module,
        as: 'modules',
        include: [{
          model: require('../models').Lesson,
          as: 'lessons'
        }]
      }]
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const allLessons = [];
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push(lesson.id);
      });
    });

    const progress = await UserProgress.findAll({
      where: {
        user_id: userId,
        lesson_id: allLessons
      }
    });

    const completedCount = progress.filter(p => p.is_completed).length;
    const totalLessons = allLessons.length;

    res.json({
      course_id: courseId,
      total_lessons: totalLessons,
      completed_lessons: completedCount,
      completion_percentage: totalLessons > 0
        ? (completedCount / totalLessons * 100).toFixed(2)
        : 0,
      lesson_ids: allLessons,
      completed_lesson_ids: progress.filter(p => p.is_completed).map(p => p.lesson_id)
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
};
