const { Course, Module, Lesson } = require('../models');

exports.getCourses = async (req, res) => {
  try {
    const { published } = req.query;
    const where = published === 'false' ? {} : { is_published: true };

    const courses = await Course.findAll({
      where,
      include: [{
        model: Module,
        as: 'modules',
        attributes: ['id', 'title', 'description', 'order_index'],
        include: [{
          model: Lesson,
          as: 'lessons',
          attributes: ['id', 'title', 'type', 'order_index', 'is_published']
        }]
      }],
      order: [['created_at', 'ASC']]
    });

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [{
        model: Module,
        as: 'modules',
        order: [['order_index', 'ASC']],
        include: [{
          model: Lesson,
          as: 'lessons',
          order: [['order_index', 'ASC']]
        }]
      }]
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

exports.getCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await Course.findOne({
      where: { slug, is_published: true },
      include: [{
        model: Module,
        as: 'modules',
        order: [['order_index', 'ASC']],
        include: [{
          model: Lesson,
          as: 'lessons',
          where: { is_published: true },
          order: [['order_index', 'ASC']]
        }]
      }]
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Course.update(req.body, {
      where: { id },
      returning: true
    });

    if (updated === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = await Course.findByPk(id);
    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Course.destroy({ where: { id } });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};
