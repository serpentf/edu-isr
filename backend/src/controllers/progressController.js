const { UserProgress, Lesson, Course, LessonAttempt } = require('../models');
const { gradeQuiz, PASS_SCORE, isServerGraded } = require('../services/certification');

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
    const { is_completed, code_submission } = req.body;
    const userId = req.user.id;

    const lesson = await Lesson.findByPk(lessonId, { attributes: ['id', 'type', 'code_challenge_data'] });
    if (!lesson) {
      return res.status(404).json({ error: 'Урок не найден' });
    }
    // Quizzes and DevTools labs are completed only through server-side grading
    if (isServerGraded(lesson)) {
      return res.status(400).json({ error: 'Результат сохраняется только при отправке ответов' });
    }
    const autoGraded = lesson.type === 'code_challenge' && lesson.code_challenge_data?.language === 'javascript';
    if (autoGraded && is_completed && !(typeof code_submission === 'string' && code_submission.trim())) {
      return res.status(400).json({ error: 'Для практики нужно отправить решение' });
    }

    let progress = await UserProgress.findOne({
      where: { user_id: userId, lesson_id: lessonId }
    });

    // Completion is sticky: a later request cannot undo a passed lesson
    const completed = Boolean(is_completed) || Boolean(progress?.is_completed);
    const data = {
      user_id: userId,
      lesson_id: lessonId,
      is_completed: completed,
      completed_at: completed ? (progress?.completed_at || new Date()) : null
    };
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

exports.submitQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson || lesson.type !== 'quiz') {
      return res.status(404).json({ error: 'Тест не найден' });
    }
    const questions = lesson.getDataValue('quiz_data')?.questions || [];
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return res.status(400).json({ error: 'Ответьте на все вопросы теста' });
    }

    const { score, passed, results } = gradeQuiz(lesson, answers);
    await LessonAttempt.create({
      user_id: userId,
      lesson_id: lesson.id,
      kind: 'quiz',
      score,
      passed,
      details: { answers, results: results.map((r) => r.correct) }
    });

    const progress = await UserProgress.findOne({ where: { user_id: userId, lesson_id: lessonId } });
    // Keep the best attempt; a passed quiz stays passed
    const bestScore = Math.max(score, progress?.quiz_score ?? 0);
    const completed = passed || Boolean(progress?.is_completed);
    const data = {
      user_id: userId,
      lesson_id: lessonId,
      quiz_score: bestScore,
      is_completed: completed,
      completed_at: completed ? (progress?.completed_at || new Date()) : null
    };
    if (progress) {
      await progress.update(data);
    } else {
      await UserProgress.create(data);
    }

    // Per-question result without the correct answer: the student sees where they were wrong
    res.json({ score, passed, best_score: bestScore, pass_score: PASS_SCORE, results });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Не удалось проверить тест' });
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
