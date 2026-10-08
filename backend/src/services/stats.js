const { Course, User, UserProgress, Certificate } = require('../models');
const { loadCourseStructure } = require('./certification');

// Student status in a course, from most to least advanced
const STATUS = {
  CERTIFIED: 'certified',     // certificate issued and valid
  REVOKED: 'revoked',         // certificate revoked by an admin
  COMPLETED: 'completed',     // all requirements met, certificate not requested yet
  IN_PROGRESS: 'in_progress'  // at least one lesson started
};

const average = (values) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
const maxDate = (dates) => (dates.length ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))) : null);
const minDate = (dates) => (dates.length ? new Date(Math.min(...dates.map((d) => new Date(d).getTime()))) : null);

// Short overview of every course: used for the course selector
const getCoursesOverview = async () => {
  const courses = await Course.findAll({ attributes: ['id', 'title', 'slug', 'is_published'], order: [['id', 'ASC']] });
  const result = [];
  for (const course of courses) {
    const structure = await loadCourseStructure(course.id);
    const lessonIds = structure.lessons.map((l) => l.lesson.id);
    const students = lessonIds.length
      ? await UserProgress.count({
        where: { lesson_id: lessonIds },
        include: [{ model: User, as: 'user', where: { role: 'student' }, attributes: [] }],
        distinct: true,
        col: 'user_id'
      })
      : 0;
    const certificates = await Certificate.count({
      where: { course_id: course.id, revoked_at: null },
      include: [{ model: User, as: 'user', where: { role: 'student' }, attributes: [] }]
    });
    result.push({ id: course.id, title: course.title, slug: course.slug, is_published: course.is_published, students, certificates });
  }
  return result;
};

const getCourseStats = async (courseId) => {
  const structure = await loadCourseStructure(courseId);
  if (!structure) return null;
  const { course, lessons } = structure;
  const lessonIds = lessons.map((l) => l.lesson.id);
  const requiredIds = new Set(lessons.filter((l) => l.required).map((l) => l.lesson.id));
  const quizIds = new Set(lessons.filter((l) => l.lesson.type === 'quiz').map((l) => l.lesson.id));

  const progress = lessonIds.length
    ? await UserProgress.findAll({
      where: { lesson_id: lessonIds },
      attributes: ['user_id', 'lesson_id', 'is_completed', 'quiz_score', 'createdAt', 'updatedAt']
    })
    : [];
  const userIds = [...new Set(progress.map((p) => p.user_id))];
  // Admins test courses themselves; their activity would distort the numbers
  const users = userIds.length
    ? await User.findAll({ where: { id: userIds, role: 'student' }, attributes: ['id', 'name', 'email', 'createdAt'] })
    : [];
  const certificates = await Certificate.findAll({ where: { course_id: courseId } });
  const certificateByUser = new Map(certificates.map((c) => [c.user_id, c]));

  const progressByUser = new Map();
  for (const record of progress) {
    if (!progressByUser.has(record.user_id)) progressByUser.set(record.user_id, []);
    progressByUser.get(record.user_id).push(record);
  }

  const students = users.map((user) => {
    const records = progressByUser.get(user.id) || [];
    const completed = records.filter((r) => r.is_completed);
    const requiredPassed = completed.filter((r) => requiredIds.has(r.lesson_id)).length;
    const quizRecords = records.filter((r) => quizIds.has(r.lesson_id));
    const certificate = certificateByUser.get(user.id);

    let status = STATUS.IN_PROGRESS;
    if (certificate?.revoked_at) status = STATUS.REVOKED;
    else if (certificate) status = STATUS.CERTIFIED;
    else if (requiredIds.size > 0 && requiredPassed === requiredIds.size) status = STATUS.COMPLETED;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      registered_at: user.createdAt,
      started_at: minDate(records.map((r) => r.createdAt)),
      last_activity: maxDate(records.map((r) => r.updatedAt)),
      lessons_completed: completed.length,
      required_passed: requiredPassed,
      quizzes_passed: quizRecords.filter((r) => r.is_completed).length,
      quizzes_attempted: quizRecords.length,
      average_quiz_score: average(quizRecords.map((r) => r.quiz_score).filter((s) => s !== null)),
      status,
      certificate_code: certificate?.code || null
    };
  }).sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

  // Per lesson: how many students got there, passed, and how hard the quizzes are
  const lessonStats = lessons.map(({ lesson, module, required }) => {
    const records = progress.filter((p) => p.lesson_id === lesson.id);
    return {
      lesson_id: lesson.id,
      title: lesson.title,
      module_title: module.title,
      type: lesson.type,
      required,
      started: records.length,
      completed: records.filter((r) => r.is_completed).length,
      average_score: lesson.type === 'quiz' ? average(records.map((r) => r.quiz_score).filter((s) => s !== null)) : null
    };
  });

  const countStatus = (status) => students.filter((s) => s.status === status).length;

  return {
    course: { id: course.id, title: course.title, slug: course.slug },
    totals: {
      registered_users: await User.count({ where: { role: 'student' } }),
      students: students.length,
      in_progress: countStatus(STATUS.IN_PROGRESS),
      completed: countStatus(STATUS.COMPLETED),
      certified: countStatus(STATUS.CERTIFIED),
      revoked: countStatus(STATUS.REVOKED),
      total_lessons: lessons.length,
      required_total: requiredIds.size,
      quizzes_total: quizIds.size
    },
    students,
    lessons: lessonStats
  };
};

// One student in one course: every lesson with result, dates and submitted code
const getStudentCourseStats = async (courseId, userId) => {
  const structure = await loadCourseStructure(courseId);
  if (!structure) return null;
  const user = await User.findByPk(userId, { attributes: ['id', 'name', 'email', 'role', 'is_active', 'createdAt'] });
  if (!user) return null;

  const progress = await UserProgress.findAll({
    where: { user_id: userId, lesson_id: structure.lessons.map((l) => l.lesson.id) }
  });
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]));
  const certificate = await Certificate.findOne({ where: { course_id: courseId, user_id: userId } });

  return {
    course: { id: structure.course.id, title: structure.course.title, slug: structure.course.slug },
    user,
    certificate,
    lessons: structure.lessons.map(({ lesson, module, required }) => {
      const record = byLesson.get(lesson.id);
      return {
        lesson_id: lesson.id,
        title: lesson.title,
        module_title: module.title,
        type: lesson.type,
        required,
        started: Boolean(record),
        completed: Boolean(record?.is_completed),
        completed_at: record?.completed_at || null,
        score: record?.quiz_score ?? null,
        code_submission: typeof record?.code_submission === 'string' ? record.code_submission : null
      };
    })
  };
};

module.exports = { STATUS, getCoursesOverview, getCourseStats, getStudentCourseStats };
