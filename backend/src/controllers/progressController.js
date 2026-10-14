const { UserProgress, Lesson, Course, LessonAttempt } = require('../models');
const { gradeQuiz, PASS_SCORE, isServerGraded } = require('../services/certification');
const { practicePercent, isJsChallenge, saveProgress } = require('../services/practice');

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

// The student's own work on one lesson: completion, progress and the saved draft
exports.getLessonProgress = async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, { attributes: ['id', 'type', 'code_challenge_data', 'checklist'] });
    if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
    const progress = await UserProgress.findOne({ where: { user_id: req.user.id, lesson_id: lesson.id } });
    res.json({
      is_completed: Boolean(progress?.is_completed),
      progress_percent: practicePercent(lesson, progress),
      draft: progress?.draft ?? null,
      draft_saved_at: progress?.draft_saved_at ?? null
    });
  } catch (error) {
    console.error('Get lesson progress error:', error);
    res.status(500).json({ error: 'Не удалось загрузить прогресс' });
  }
};

// Every run of a JavaScript challenge: the tests are graded in the browser, the server keeps
// the code as a draft, the share of caught bugs as progress and the run in the history
exports.saveChallengeRun = async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, { attributes: ['id', 'type', 'code_challenge_data'] });
    if (!lesson || !isJsChallenge(lesson)) return res.status(404).json({ error: 'Задание не найдено' });

    const { code, result } = req.body || {};
    const mutantCount = lesson.code_challenge_data.mutants?.length || 0;
    const { tests, tests_passed: testsPassed, caught } = result || {};
    if (typeof code !== 'string' || !Number.isInteger(tests) || !Number.isInteger(testsPassed) ||
        testsPassed < 0 || testsPassed > tests || !Array.isArray(caught) || caught.length !== mutantCount) {
      return res.status(400).json({ error: 'Некорректный результат запуска' });
    }

    // Bugs count only when every test passes on the correct implementation
    const referencePassed = tests > 0 && testsPassed === tests;
    const caughtCount = referencePassed ? caught.filter(Boolean).length : 0;
    const percent = mutantCount ? Math.round((caughtCount / mutantCount) * 100) : 0;
    const passed = referencePassed && tests >= (lesson.code_challenge_data.minTests || 1) && caughtCount === mutantCount;

    await LessonAttempt.create({
      user_id: req.user.id,
      lesson_id: lesson.id,
      kind: 'challenge',
      score: percent,
      passed,
      details: { tests, tests_passed: testsPassed, caught: caught.map(Boolean) }
    });
    const fields = { draft: { code }, draft_saved_at: new Date(), progress_percent: percent };
    if (passed) Object.assign(fields, { is_completed: true, code_submission: code });
    const progress = await saveProgress(req.user.id, lesson.id, fields);

    res.json({
      is_completed: progress.is_completed,
      progress_percent: practicePercent(lesson, progress),
      draft_saved_at: progress.draft_saved_at
    });
  } catch (error) {
    console.error('Save challenge run error:', error);
    res.status(500).json({ error: 'Не удалось сохранить результат' });
  }
};

// Ticks in a practice checklist; ticking every item completes the lesson
exports.saveChecklist = async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, { attributes: ['id', 'checklist'] });
    if (!lesson?.checklist?.length) return res.status(404).json({ error: 'У урока нет чек-листа' });
    const checked = req.body?.checked;
    if (!Array.isArray(checked)) return res.status(400).json({ error: 'Некорректный чек-лист' });

    const items = lesson.checklist.filter((item) => checked.includes(item));
    const percent = practicePercent(lesson, { draft: { checked: items } });
    const progress = await saveProgress(req.user.id, lesson.id, {
      draft: { checked: items },
      draft_saved_at: new Date(),
      progress_percent: percent,
      is_completed: percent === 100
    });

    res.json({ is_completed: progress.is_completed, progress_percent: percent, checked: items });
  } catch (error) {
    console.error('Save checklist error:', error);
    res.status(500).json({ error: 'Не удалось сохранить чек-лист' });
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
    const lessonsById = new Map();
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push(lesson.id);
        lessonsById.set(lesson.id, lesson);
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
      completed_lesson_ids: progress.filter(p => p.is_completed).map(p => p.lesson_id),
      // Practices started but not completed: lesson id -> percent done
      lesson_progress: Object.fromEntries(progress
        .filter((p) => !p.is_completed)
        .map((p) => [p.lesson_id, practicePercent(lessonsById.get(p.lesson_id), p)])
        .filter(([, percent]) => percent !== null))
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
};
