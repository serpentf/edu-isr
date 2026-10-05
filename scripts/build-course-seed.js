#!/usr/bin/env node
// Builds a MySQL seed script from a course folder (see course/testing-software/README.md).
// Targets the tables created by Sequelize sync (underscored, lowercase), not docker/mysql/init.sql.
// Usage: node scripts/build-course-seed.js <course-dir> [output.sql]

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const courseDir = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(courseDir, 'course.json'))) {
  console.error('Usage: node scripts/build-course-seed.js <course-dir> [output.sql]');
  process.exit(1);
}

const course = JSON.parse(fs.readFileSync(path.join(courseDir, 'course.json'), 'utf8'));
const outFile = path.resolve(process.argv[3] || path.join(ROOT, 'docker/mysql', `seed-${course.slug}.sql`));
const publicAssets = `/courses/${course.slug}/`;

const sql = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

const sortedEntries = (dir) => fs.readdirSync(dir).filter((f) => /^\d+-/.test(f)).sort();

// Splits "# Title\n\nbody" into { title, body }; the platform renders the title separately.
const splitTitle = (markdown, file) => {
  const match = markdown.match(/^#\s+(.+)\r?\n/m);
  if (!match) throw new Error(`No "# Title" heading in ${file}`);
  const body = markdown.slice(match.index + match[0].length).trim();
  return { title: match[1].trim(), body };
};

// Relative links to the course assets folder become public URLs served by the frontend.
const rewriteAssets = (markdown) => markdown.replace(/(?:\.\.\/)+assets\//g, publicAssets);

const readLesson = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const quiz = JSON.parse(text);
    for (const q of quiz.questions) {
      if (!q.options.includes(q.correct)) throw new Error(`${file}: answer "${q.correct}" is not among options`);
    }
    return { title: quiz.title, content: quiz.intro || '', type: 'quiz', quiz_data: { questions: quiz.questions } };
  }
  const { title, body } = splitTitle(text, file);
  const lesson = { title, content: rewriteAssets(body), type: 'text' };
  if (file.endsWith('.challenge.md')) {
    const { content, data } = parseChallenge(lesson.content, file);
    lesson.type = 'code_challenge';
    lesson.content = content;
    lesson.code_challenge_data = data;
    challenges.push({ file, data });
  }
  return lesson;
};

// JavaScript challenges keep their code in tagged fences: ```js @subject, @starter, @solution,
// @mutant <hint>, and ```json @config. They are removed from the lesson text and stored as data.
const challenges = [];
const TAGGED_FENCE = /^```(\w+) @(\w+)(?: (.*))?\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;

const parseChallenge = (markdown, file) => {
  const data = { language: 'javascript', subject: '', starter: '', solution: '', minTests: 1, mutants: [] };
  const content = markdown.replace(TAGGED_FENCE, (_, lang, tag, arg, code) => {
    const source = code.replace(/\s+$/, '');
    if (tag === 'mutant') data.mutants.push({ hint: (arg || '').trim(), source });
    else if (tag === 'config') Object.assign(data, JSON.parse(source));
    else if (['subject', 'starter', 'solution'].includes(tag)) data[tag] = source;
    else throw new Error(`${file}: unknown block @${tag}`);
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();

  if (!data.subject) throw new Error(`${file}: missing \`\`\`js @subject block`);
  if (!data.solution) throw new Error(`${file}: missing \`\`\`js @solution block`);
  if (!data.mutants.length) throw new Error(`${file}: at least one @mutant block is required`);
  return { content, data };
};

// Grades the reference solution with the same core the browser uses
const validateChallenges = async () => {
  const corePath = path.join(ROOT, 'frontend/src/utils/challengeCore.js');
  const { evaluateChallenge, isChallengePassed } = await import(pathToFileURL(corePath).href);

  for (const { file, data } of challenges) {
    const name = path.relative(courseDir, file);
    const result = evaluateChallenge({ ...data, code: data.solution });
    if (!isChallengePassed(result, data.minTests)) {
      const failed = result.error ? [result.error] : [
        ...result.tests.filter((t) => !t.passed).map((t) => `test "${t.name}": ${t.error}`),
        ...result.mutants.filter((m) => !m.caught).map((m) => `mutant not caught: ${m.hint}`),
        ...(result.tests.length < data.minTests ? [`only ${result.tests.length} tests, minTests is ${data.minTests}`] : [])
      ];
      throw new Error(`${name}: reference solution does not pass\n  ${failed.join('\n  ')}`);
    }
    if (data.starter && isChallengePassed(evaluateChallenge({ ...data, code: data.starter }), data.minTests)) {
      throw new Error(`${name}: starter code already passes the challenge`);
    }
  }
};

const lines = [
  `-- Generated by scripts/build-course-seed.js from ${path.relative(ROOT, courseDir)}. Do not edit by hand.`,
  '-- Requires at least one user with role = admin (becomes the course author).',
  'SET NAMES utf8mb4;',
  'START TRANSACTION;',
  '',
  "SET @author_id = (SELECT id FROM `users` WHERE role = 'admin' ORDER BY id LIMIT 1);",
  'INSERT INTO `courses` (`title`, `description`, `slug`, `level`, `duration_hours`, `is_published`, `created_by`, `created_at`, `updated_at`) VALUES',
  `(${[course.title, course.description, course.slug, course.level, course.duration_hours, course.is_published].map(sql).join(', ')}, @author_id, NOW(), NOW());`,
  'SET @course_id = LAST_INSERT_ID();',
];

const stats = { modules: 0, text: 0, code_challenge: 0, quiz: 0 };
const modulesDir = path.join(courseDir, 'modules');

sortedEntries(modulesDir).forEach((moduleName, moduleIndex) => {
  const moduleDir = path.join(modulesDir, moduleName);
  const readme = splitTitle(fs.readFileSync(path.join(moduleDir, 'README.md'), 'utf8'), moduleName);
  const description = readme.body.split(/\r?\n\r?\n/)[0];
  stats.modules++;

  lines.push('', `-- ${moduleName}`);
  lines.push('INSERT INTO `modules` (`course_id`, `title`, `description`, `order_index`, `created_at`, `updated_at`) VALUES');
  lines.push(`(@course_id, ${sql(readme.title)}, ${sql(description)}, ${moduleIndex + 1}, NOW(), NOW());`);
  lines.push('SET @module_id = LAST_INSERT_ID();');

  const lessonsDir = path.join(moduleDir, 'lessons');
  sortedEntries(lessonsDir).forEach((lessonName, lessonIndex) => {
    const lesson = readLesson(path.join(lessonsDir, lessonName));
    stats[lesson.type]++;
    const values = [
      lesson.title,
      lesson.content,
      lesson.type,
      lesson.quiz_data ? JSON.stringify(lesson.quiz_data) : null,
      lesson.code_challenge_data ? JSON.stringify(lesson.code_challenge_data) : null,
      lessonIndex + 1,
      true,
    ].map(sql);
    lines.push('INSERT INTO `lessons` (`module_id`, `title`, `content`, `type`, `quiz_data`, `code_challenge_data`, `order_index`, `is_published`, `created_at`, `updated_at`) VALUES');
    lines.push(`(@module_id, ${values.join(', ')}, NOW(), NOW());`);
  });
});

lines.push('', 'COMMIT;', '');

validateChallenges().then(() => {
  fs.writeFileSync(outFile, lines.join('\n'));

  const assetsDir = path.join(courseDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const target = path.join(ROOT, 'frontend/public', publicAssets);
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(assetsDir, target, { recursive: true });
  }

  console.log(`${path.relative(ROOT, outFile)}: ${stats.modules} modules, ` +
    `${stats.text} text, ${stats.code_challenge} code challenges (${challenges.length} auto-graded), ${stats.quiz} quizzes`);
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
