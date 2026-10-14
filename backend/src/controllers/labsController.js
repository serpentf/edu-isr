const { Lesson, UserProgress, LessonAttempt } = require('../models');
const { REVIEWS_STATUS, TASKS, isLabLesson, getClues, checkAnswers } = require('../services/devtoolsLab');
const { saveProgress } = require('../services/practice');

const findLab = async (lessonId) => {
  const lesson = await Lesson.findByPk(lessonId, { attributes: ['id', 'type', 'code_challenge_data'] });
  return isLabLesson(lesson) ? lesson : null;
};

// Clues the lab page hides for this student, and the task list for the answer form
exports.getState = async (req, res) => {
  try {
    const lesson = await findLab(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Лаборатория не найдена' });

    const { promo, console_code, storage_token, mobile_code } = getClues(req.user.id, lesson.id);
    const progress = await UserProgress.findOne({ where: { user_id: req.user.id, lesson_id: lesson.id } });

    res.json({
      clues: { promo, console_code, storage_token, mobile_code },
      tasks: TASKS.map(({ key, panel, label }) => ({ key, panel, label })),
      completed: Boolean(progress?.is_completed),
      answers: progress?.draft?.answers || {},
      progress_percent: progress?.progress_percent ?? null
    });
  } catch (error) {
    console.error('Lab state error:', error);
    res.status(500).json({ error: 'Не удалось загрузить лабораторию' });
  }
};

// Fails on purpose: the student inspects this request in the Network panel
exports.getReviews = async (req, res) => {
  try {
    const lesson = await findLab(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Лаборатория не найдена' });

    const { request_id, debug_token } = getClues(req.user.id, lesson.id);
    res.set('X-Debug-Token', debug_token);
    res.set('Cache-Control', 'no-store');
    res.status(REVIEWS_STATUS).json({
      error: 'Reviews service temporarily unavailable',
      request_id
    });
  } catch (error) {
    console.error('Lab reviews error:', error);
    res.status(500).json({ error: 'Не удалось выполнить запрос' });
  }
};

exports.check = async (req, res) => {
  try {
    const lesson = await findLab(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Лаборатория не найдена' });

    const answers = req.body?.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'Заполните ответы' });
    }
    const { passed, results } = checkAnswers(req.user.id, lesson.id, answers);
    const score = Math.round((results.filter((r) => r.correct).length / results.length) * 100);
    await LessonAttempt.create({
      user_id: req.user.id,
      lesson_id: lesson.id,
      kind: 'lab',
      score,
      passed,
      details: { results: results.map(({ key, correct }) => ({ key, correct })) }
    });

    // The answers are kept as a draft: the form is filled in again after a reload
    const draft = {};
    for (const { key } of TASKS) {
      if (typeof answers[key] === 'string') draft[key] = answers[key].slice(0, 500);
    }
    await saveProgress(req.user.id, lesson.id, {
      draft: { answers: draft },
      draft_saved_at: new Date(),
      progress_percent: score,
      is_completed: passed
    });

    res.json({ passed, results });
  } catch (error) {
    console.error('Lab check error:', error);
    res.status(500).json({ error: 'Не удалось проверить ответы' });
  }
};
