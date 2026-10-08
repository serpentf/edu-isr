const crypto = require('crypto');
const { Course, Module, Lesson, UserProgress, Certificate } = require('../models');

// A quiz is passed with at least this score, percent
const PASS_SCORE = 70;

// Grades answers against the raw quiz data (the public value has no correct answers)
const gradeQuiz = (lesson, answers) => {
  const questions = lesson.getDataValue('quiz_data')?.questions || [];
  const results = questions.map((question, index) => ({ correct: answers[index] === question.correct }));
  const correctCount = results.filter((r) => r.correct).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  return { score, passed: score >= PASS_SCORE, results };
};

// Lessons that count towards the certificate: every quiz (graded on the server) and every
// auto-graded JavaScript challenge. Text lessons and the written final project do not count.
const isRequired = (lesson) =>
  lesson.type === 'quiz' ||
  (lesson.type === 'code_challenge' && lesson.code_challenge_data?.language === 'javascript');

// Course with modules and published lessons in display order
const loadCourseStructure = async (courseId) => {
  const course = await Course.findByPk(courseId, {
    attributes: ['id', 'title', 'slug', 'is_published'],
    include: [{
      model: Module,
      as: 'modules',
      attributes: ['id', 'title', 'order_index'],
      include: [{
        model: Lesson,
        as: 'lessons',
        where: { is_published: true },
        required: false,
        attributes: ['id', 'title', 'type', 'order_index', 'code_challenge_data']
      }]
    }],
    order: [
      [{ model: Module, as: 'modules' }, 'order_index', 'ASC'],
      [{ model: Module, as: 'modules' }, { model: Lesson, as: 'lessons' }, 'order_index', 'ASC']
    ]
  });
  if (!course) return null;

  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ lesson, module, required: isRequired(lesson) }))
  );
  return { course, lessons };
};

const getCourseRequirements = async (userId, courseId) => {
  const structure = await loadCourseStructure(courseId);
  if (!structure) return null;
  const { course } = structure;
  const required = structure.lessons.filter((l) => l.required);

  const progress = required.length
    ? await UserProgress.findAll({ where: { user_id: userId, lesson_id: required.map((r) => r.lesson.id) } })
    : [];
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]));

  const items = required.map(({ lesson, module }) => {
    const record = byLesson.get(lesson.id);
    return {
      lesson_id: lesson.id,
      title: lesson.title,
      module_title: module.title,
      type: lesson.type,
      passed: Boolean(record?.is_completed),
      score: record?.quiz_score ?? null
    };
  });

  const quizScores = items.filter((i) => i.type === 'quiz' && i.score !== null).map((i) => i.score);
  const score = quizScores.length ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

  return {
    course,
    items,
    score,
    eligible: course.is_published && items.length > 0 && items.every((i) => i.passed)
  };
};

// Readable code without look-alike characters (0/O, 1/I/L): XXXX-XXXX-XXXX
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = () => {
  const bytes = crypto.randomBytes(12);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
};

const generateUniqueCode = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    if (!(await Certificate.findOne({ where: { code } }))) return code;
  }
  throw new Error('Could not generate a unique certificate code');
};

module.exports = { PASS_SCORE, gradeQuiz, isRequired, loadCourseStructure, getCourseRequirements, generateUniqueCode };
