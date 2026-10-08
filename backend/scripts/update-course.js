#!/usr/bin/env node
// Creates a course or updates it in place from its folder, keeping lesson ids, student
// progress, attempts and certificates.
// Usage: node scripts/update-course.js <course-dir> [--apply]
// Without --apply only the plan is printed; nothing is written.
//
// Matching: modules and lessons carry a stable source_key (file name without the order
// prefix). Records without a key (courses loaded before keys existed) are matched once by
// title and get their key written. Lessons removed from the folder are unpublished, never
// deleted, so their progress stays.

const path = require('path');
const { sequelize } = require('../src/config/database');
const { Course, Module, Lesson, User, UserProgress, LessonAttempt } = require('../src/models');
const { ensureSchema } = require('../src/config/schema');
const { readCourse, resolveLessonLinks, validateChallenges } = require('../../scripts/lib/course-source');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const courseDirArg = args.find((a) => !a.startsWith('--'));

// JSON with sorted keys: MySQL returns JSON objects with its own key order
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};
const sameJson = (a, b) => canonical(a) === canonical(b);

const LESSON_FIELD_NAMES = {
  title: 'название',
  type: 'тип',
  content: 'текст',
  quiz_data: 'вопросы теста',
  code_challenge_data: 'задание',
  module_id: 'модуль',
  order_index: 'порядок',
  is_published: 'публикация',
  source_key: 'ключ'
};

// Matches source items to database records: first by key, then once by title
const matchByKeyThenTitle = (sourceItems, dbItems, titleCandidates) => {
  const matches = new Map();
  const taken = new Set();
  const errors = [];

  for (const item of sourceItems) {
    const record = dbItems.find((r) => r.source_key === item.key);
    if (record) {
      matches.set(item, { record, how: 'key' });
      taken.add(record.id);
    }
  }
  for (const item of sourceItems) {
    if (matches.has(item)) continue;
    for (const candidates of titleCandidates(item)) {
      const free = candidates.filter((r) => !r.source_key && !taken.has(r.id) && r.title === item.title);
      if (free.length > 1) {
        errors.push(`«${item.title}» (${item.key}): в базе несколько записей с таким названием, сопоставить однозначно нельзя`);
        break;
      }
      if (free.length === 1) {
        matches.set(item, { record: free[0], how: 'title' });
        taken.add(free[0].id);
        break;
      }
    }
  }
  return { matches, taken, errors };
};

const main = async () => {
  if (!courseDirArg) {
    console.error('Usage: node scripts/update-course.js <course-dir> [--apply]');
    process.exit(1);
  }
  const course = readCourse(path.resolve(courseDirArg));
  await validateChallenges(course);
  const { meta } = course;

  await sequelize.authenticate();
  await ensureSchema(sequelize);

  const errors = [];
  const warnings = [];

  const dbCourse = await Course.findOne({ where: { slug: meta.slug } });
  const author = dbCourse ? null : await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']] });
  if (!dbCourse && !author) errors.push('Нет ни одного администратора: он нужен как автор нового курса (scripts/create-admin.js)');

  const dbModules = dbCourse ? await Module.findAll({ where: { course_id: dbCourse.id } }) : [];
  const dbLessons = dbModules.length ? await Lesson.findAll({ where: { module_id: dbModules.map((m) => m.id) } }) : [];

  // Students already working with each lesson: shown in the plan and in warnings
  const lessonIds = dbLessons.map((l) => l.id);
  const progressCount = new Map();
  const attemptCount = new Map();
  if (lessonIds.length) {
    for (const row of await UserProgress.findAll({ where: { lesson_id: lessonIds }, attributes: ['lesson_id'] })) {
      progressCount.set(row.lesson_id, (progressCount.get(row.lesson_id) || 0) + 1);
    }
    for (const row of await LessonAttempt.findAll({ where: { lesson_id: lessonIds }, attributes: ['lesson_id'] })) {
      attemptCount.set(row.lesson_id, (attemptCount.get(row.lesson_id) || 0) + 1);
    }
  }
  const studentsOn = (lessonId) => progressCount.get(lessonId) || 0;

  // Modules
  const moduleMatch = matchByKeyThenTitle(course.modules, dbModules, () => [dbModules]);
  errors.push(...moduleMatch.errors);
  const orphanModules = dbModules.filter((m) => !moduleMatch.taken.has(m.id));

  // Lessons: by key; then by title in the matched module; then by title anywhere in the course
  const moduleOf = new Map(course.modules.flatMap((m) => m.lessons.map((l) => [l, m])));
  const lessonMatch = matchByKeyThenTitle(course.lessons, dbLessons, (lesson) => {
    const dbModule = moduleMatch.matches.get(moduleOf.get(lesson))?.record;
    return [dbModule ? dbLessons.filter((l) => l.module_id === dbModule.id) : [], dbLessons];
  });
  errors.push(...lessonMatch.errors);
  const orphanLessons = dbLessons.filter((l) => !lessonMatch.taken.has(l.id));

  // Content with links resolved; links to lessons that do not exist yet are filled in on apply
  const idOf = (lesson) => lessonMatch.matches.get(lesson)?.record.id;
  const contentFor = (lesson, ids = idOf) => resolveLessonLinks(course, lesson, (linked) => `/lesson/${ids(linked) ?? 'new'}`);

  const lessonPlans = course.lessons.map((lesson) => {
    const match = lessonMatch.matches.get(lesson);
    if (!match) return { lesson, action: 'create' };
    const record = match.record;
    const target = {
      title: lesson.title,
      type: lesson.type,
      content: contentFor(lesson),
      quiz_data: lesson.quiz_data || null,
      code_challenge_data: lesson.code_challenge_data || null,
      order_index: lesson.order_index,
      is_published: true,
      source_key: lesson.key
    };
    const changed = Object.keys(target).filter((field) => {
      const current = field === 'quiz_data' ? record.getDataValue('quiz_data') : record[field];
      return ['quiz_data', 'code_challenge_data'].includes(field) ? !sameJson(current, target[field]) : current !== target[field];
    });
    const targetModule = moduleMatch.matches.get(moduleOf.get(lesson))?.record;
    if (!targetModule || targetModule.id !== record.module_id) changed.push('module_id');

    const students = studentsOn(record.id);
    if (students && changed.includes('quiz_data')) {
      warnings.push(`«${lesson.title}»: вопросы теста изменятся, у ${students} студ. сохранятся прежние результаты (пересчитать по новым вопросам их нельзя)`);
    }
    if (students && changed.includes('type')) {
      warnings.push(`«${lesson.title}»: меняется тип урока (${record.type} → ${lesson.type}), прогресс ${students} студ. сохранится`);
    }
    // A key written on the first title match alone is not a change of the lesson
    const meaningful = changed.filter((field) => field !== 'source_key');
    return { lesson, action: meaningful.length ? 'update' : 'same', record, how: match.how, changed: meaningful };
  });

  const toUnpublish = orphanLessons.filter((l) => l.is_published);
  for (const lesson of toUnpublish) {
    if (studentsOn(lesson.id)) {
      warnings.push(`«${lesson.title}» нет в папке курса: урок снимется с публикации, прогресс ${studentsOn(lesson.id)} студ. сохранится`);
    }
  }
  for (const module of orphanModules) {
    warnings.push(`Модуля «${module.title}» нет в папке курса: его уроки снимутся с публикации`);
  }

  // Report
  const count = (action) => lessonPlans.filter((p) => p.action === action);
  const byTitle = lessonPlans.filter((p) => p.how === 'title').length + [...moduleMatch.matches.values()].filter((m) => m.how === 'title').length;
  console.log(`\nКурс «${meta.title}» (${meta.slug}): ${dbCourse ? `обновление, id ${dbCourse.id}` : 'будет создан'}`);
  console.log(`Модули: ${course.modules.length}, новых ${course.modules.filter((m) => !moduleMatch.matches.has(m)).length}`);
  console.log(`Уроки: без изменений ${count('same').length}, изменятся ${count('update').length}, новых ${count('create').length}, снимутся с публикации ${toUnpublish.length}`);
  if (byTitle) console.log(`Первое сопоставление по названиям: ${byTitle} записей получат постоянный ключ`);

  for (const plan of count('update')) {
    const fields = plan.changed.map((f) => LESSON_FIELD_NAMES[f] || f).join(', ');
    const students = studentsOn(plan.record.id);
    console.log(`  ~ [${plan.record.id}] ${plan.lesson.title}: ${fields}${students ? ` (прогресс: ${students} студ.)` : ''}`);
  }
  for (const plan of count('create')) console.log(`  + ${plan.lesson.title} (${plan.lesson.key})`);
  for (const lesson of toUnpublish) console.log(`  - [${lesson.id}] ${lesson.title}`);
  for (const warning of warnings) console.log(`  ! ${warning}`);
  for (const error of errors) console.log(`  ✗ ${error}`);

  if (errors.length) {
    console.log('\nОбновление невозможно, исправьте ошибки выше. В базе ничего не изменено.');
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log('\nЭто предварительный просмотр, в базе ничего не изменено. Чтобы применить, добавьте --apply.');
    return;
  }

  // Apply: one transaction, all or nothing
  await sequelize.transaction(async (transaction) => {
    const options = { transaction };
    let courseRecord = dbCourse;
    const courseFields = { title: meta.title, description: meta.description, level: meta.level, duration_hours: meta.duration_hours };
    if (courseRecord) {
      await courseRecord.update(courseFields, options);
    } else {
      courseRecord = await Course.create({ ...courseFields, slug: meta.slug, is_published: meta.is_published, created_by: author.id }, options);
    }

    const moduleIds = new Map();
    for (const module of course.modules) {
      const fields = { title: module.title, description: module.description, order_index: module.order_index, source_key: module.key };
      let record = moduleMatch.matches.get(module)?.record;
      if (record) await record.update(fields, options);
      else record = await Module.create({ ...fields, course_id: courseRecord.id }, options);
      moduleIds.set(module, record.id);
    }

    // Lessons first without links, then content once every lesson has an id
    const finalIds = new Map();
    for (const plan of lessonPlans) {
      const { lesson } = plan;
      const fields = {
        module_id: moduleIds.get(moduleOf.get(lesson)),
        title: lesson.title,
        type: lesson.type,
        quiz_data: lesson.quiz_data || null,
        code_challenge_data: lesson.code_challenge_data || null,
        order_index: lesson.order_index,
        is_published: true,
        source_key: lesson.key
      };
      let record = plan.record;
      if (record) await record.update(fields, options);
      else record = await Lesson.create({ ...fields, content: '' }, options);
      finalIds.set(lesson, record);
    }
    for (const [lesson, record] of finalIds) {
      const content = contentFor(lesson, (linked) => finalIds.get(linked).id);
      if (record.content !== content) await record.update({ content }, options);
    }

    for (const lesson of orphanLessons) {
      if (lesson.is_published) await lesson.update({ is_published: false }, options);
    }
  });

  console.log('\nГотово: изменения применены.');
};

main()
  .catch((error) => {
    console.error(`\n✗ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
