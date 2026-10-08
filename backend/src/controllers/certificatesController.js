const { Certificate, Course, User } = require('../models');
const { PASS_SCORE, getCourseRequirements, generateUniqueCode } = require('../services/certification');

const courseAttributes = ['id', 'title', 'slug'];

// Requirements progress and the certificate, if already issued
exports.getStatus = async (req, res) => {
  try {
    const requirements = await getCourseRequirements(req.user.id, req.params.courseId);
    if (!requirements) {
      return res.status(404).json({ error: 'Курс не найден' });
    }
    const certificate = await Certificate.findOne({
      where: { user_id: req.user.id, course_id: req.params.courseId }
    });
    res.json({
      eligible: requirements.eligible,
      score: requirements.score,
      pass_score: PASS_SCORE,
      items: requirements.items,
      certificate
    });
  } catch (error) {
    console.error('Certificate status error:', error);
    res.status(500).json({ error: 'Не удалось получить статус сертификата' });
  }
};

exports.issue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    // One certificate per course: repeated requests return the existing one
    const existing = await Certificate.findOne({ where: { user_id: userId, course_id: courseId } });
    if (existing) {
      return res.json(existing);
    }

    const requirements = await getCourseRequirements(userId, courseId);
    if (!requirements) {
      return res.status(404).json({ error: 'Курс не найден' });
    }
    if (!requirements.eligible) {
      return res.status(400).json({ error: 'Сначала сдайте все тесты и практические задания курса' });
    }

    const certificate = await Certificate.create({
      code: await generateUniqueCode(),
      user_id: userId,
      course_id: courseId,
      full_name: req.body.full_name,
      score: requirements.score
    });
    res.status(201).json(certificate);
  } catch (error) {
    // Two simultaneous requests: the unique index keeps a single certificate
    if (error.name === 'SequelizeUniqueConstraintError') {
      const existing = await Certificate.findOne({ where: { user_id: req.user.id, course_id: req.params.courseId } });
      if (existing) return res.json(existing);
    }
    console.error('Issue certificate error:', error);
    res.status(500).json({ error: 'Не удалось выдать сертификат' });
  }
};

exports.getMine = async (req, res) => {
  try {
    const certificates = await Certificate.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Course, as: 'course', attributes: courseAttributes }],
      order: [['issued_at', 'DESC']]
    });
    res.json(certificates);
  } catch (error) {
    console.error('My certificates error:', error);
    res.status(500).json({ error: 'Не удалось получить сертификаты' });
  }
};

// Public: anyone with the code can check that the certificate is genuine
exports.verify = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      where: { code: String(req.params.code).toUpperCase() },
      include: [{ model: Course, as: 'course', attributes: courseAttributes }]
    });
    if (!certificate) {
      return res.status(404).json({ error: 'Сертификат не найден' });
    }
    res.json({
      code: certificate.code,
      full_name: certificate.full_name,
      course: certificate.course,
      score: certificate.score,
      issued_at: certificate.issued_at,
      revoked: Boolean(certificate.revoked_at),
      revoked_at: certificate.revoked_at
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Не удалось проверить сертификат' });
  }
};

exports.list = async (req, res) => {
  try {
    const certificates = await Certificate.findAll({
      include: [
        { model: Course, as: 'course', attributes: courseAttributes },
        { model: User, as: 'user', attributes: ['id', 'email', 'name'] }
      ],
      order: [['issued_at', 'DESC']]
    });
    res.json(certificates);
  } catch (error) {
    console.error('List certificates error:', error);
    res.status(500).json({ error: 'Не удалось получить сертификаты' });
  }
};

exports.revoke = async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: 'Сертификат не найден' });
    }
    if (!certificate.revoked_at) {
      await certificate.update({
        revoked_at: new Date(),
        revoke_reason: (req.body.reason || '').toString().slice(0, 255) || null
      });
    }
    res.json(certificate);
  } catch (error) {
    console.error('Revoke certificate error:', error);
    res.status(500).json({ error: 'Не удалось отозвать сертификат' });
  }
};
