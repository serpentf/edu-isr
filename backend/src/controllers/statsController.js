const { getCoursesOverview, getCourseStats, getStudentCourseStats } = require('../services/stats');

exports.coursesOverview = async (req, res) => {
  try {
    res.json(await getCoursesOverview());
  } catch (error) {
    console.error('Stats overview error:', error);
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
};

exports.courseStats = async (req, res) => {
  try {
    const stats = await getCourseStats(req.params.courseId);
    if (!stats) return res.status(404).json({ error: 'Курс не найден' });
    res.json(stats);
  } catch (error) {
    console.error('Course stats error:', error);
    res.status(500).json({ error: 'Не удалось получить статистику курса' });
  }
};

exports.studentStats = async (req, res) => {
  try {
    const stats = await getStudentCourseStats(req.params.courseId, req.params.userId);
    if (!stats) return res.status(404).json({ error: 'Курс или пользователь не найден' });
    res.json(stats);
  } catch (error) {
    console.error('Student stats error:', error);
    res.status(500).json({ error: 'Не удалось получить статистику студента' });
  }
};
