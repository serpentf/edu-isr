// Progress of practical work that is not finished yet
const { UserProgress } = require('../models');
const { isLabLesson } = require('./devtoolsLab');

const isJsChallenge = (lesson) =>
  lesson?.type === 'code_challenge' && lesson.code_challenge_data?.language === 'javascript';

// Practical work with measurable progress
const isPractice = (lesson) => Boolean(lesson?.checklist?.length) || isJsChallenge(lesson) || isLabLesson(lesson);

// Percent done of a practice, or null when nothing measurable was saved. A checklist is
// recounted against the current items, so the percent stays right after the course update
// rewords or drops one; challenges and labs keep the result of the last run or check.
const practicePercent = (lesson, progress) => {
  if (!progress || !isPractice(lesson)) return null;
  // A later broken run does not make a passed practice look unfinished
  if (progress.is_completed) return 100;
  if (lesson.checklist?.length) {
    const checked = progress.draft?.checked;
    if (!Array.isArray(checked)) return null;
    const done = lesson.checklist.filter((item) => checked.includes(item)).length;
    return Math.round((done / lesson.checklist.length) * 100);
  }
  return progress.progress_percent ?? null;
};

// Saves fields of the student's progress record, creating it on the first save.
// Completion is sticky: a later save cannot undo a passed lesson.
const saveProgress = async (userId, lessonId, fields) => {
  const progress = await UserProgress.findOne({ where: { user_id: userId, lesson_id: lessonId } });
  const completed = Boolean(fields.is_completed) || Boolean(progress?.is_completed);
  const data = {
    ...fields,
    user_id: userId,
    lesson_id: lessonId,
    is_completed: completed,
    completed_at: completed ? (progress?.completed_at || new Date()) : null
  };
  return progress ? progress.update(data) : UserProgress.create(data);
};

module.exports = { isJsChallenge, practicePercent, saveProgress };
