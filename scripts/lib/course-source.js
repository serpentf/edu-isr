// Reads a course folder (see course/testing-software/README.md) into plain data.
// Shared by scripts/build-course-seed.js (SQL for a fresh database) and
// backend/scripts/update-course.js (in-place update that keeps student progress).

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');

const sortedEntries = (dir) => fs.readdirSync(dir).filter((f) => /^\d+-/.test(f)).sort();

// Every module and lesson carries an explicit, never-changing id: front matter
// (`---\nid: les-xxxx\n---`) in Markdown, an "id" field in quiz JSON. The id links the file
// to its record in the database, so files can be renamed, renumbered or moved freely.
// scripts/assign-content-ids.js adds ids to new files.
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;

// Keys used before explicit ids (folder/file name without the order prefix); kept only to
// match records of courses loaded before ids existed
const legacyModuleKey = (dirName) => dirName.replace(/^\d+-/, '');
const legacyLessonSlug = (fileName) => fileName.replace(/^\d+-/, '').replace(/(\.challenge|\.lab)?\.(md|json)$/, '');

// Splits optional front matter ("---\nkey: value\n---") from the rest of a Markdown file
const parseFrontMatter = (text) => {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z_][\w-]*):\s*(.*?)\s*$/);
    if (pair) data[pair[1]] = pair[2];
  }
  return { data, body: text.slice(match[0].length) };
};

// Splits "# Title\n\nbody" into { title, body }; the platform renders the title separately.
const splitTitle = (markdown, file) => {
  const match = markdown.match(/^#\s+(.+)\r?\n/m);
  if (!match) throw new Error(`No "# Title" heading in ${file}`);
  const body = markdown.slice(match.index + match[0].length).trim();
  return { title: match[1].trim(), body };
};

// JavaScript challenges keep their code in tagged fences: ```js @subject, @starter, @solution,
// @mutant <hint>, and ```json @config. They are removed from the lesson text and stored as data.
// @config: minTests, kind ('function' | 'api'), examples (API console presets) and
// mutantMode: 'override' — each @mutant block holds only the redefined functions and is
// appended to the subject (a later function declaration replaces an earlier one).
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

  if (data.mutantMode === 'override') {
    data.mutants = data.mutants.map((m) => ({ ...m, source: `${data.subject}\n\n${m.source}` }));
  }
  delete data.mutantMode;

  if (!data.subject) throw new Error(`${file}: missing \`\`\`js @subject block`);
  if (!data.solution) throw new Error(`${file}: missing \`\`\`js @solution block`);
  if (!data.mutants.length) throw new Error(`${file}: at least one @mutant block is required`);
  return { content, data };
};

const readLesson = (file, publicAssets) => {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const quiz = JSON.parse(text);
    for (const q of quiz.questions) {
      if (!q.options.includes(q.correct)) throw new Error(`${file}: answer "${q.correct}" is not among options`);
    }
    return { id: quiz.id, title: quiz.title, content: quiz.intro || '', type: 'quiz', quiz_data: { questions: quiz.questions } };
  }
  const { data: frontMatter, body: markdown } = parseFrontMatter(text);
  const { title, body } = splitTitle(markdown, file);
  // Relative links to the course assets folder become public URLs served by the frontend
  const lesson = { id: frontMatter.id, title, content: body.replace(/(?:\.\.\/)+assets\//g, publicAssets), type: 'text' };
  if (file.endsWith('.lab.md')) {
    // DevTools lab: the tasks and per-student answers live on the server (services/devtoolsLab.js)
    const config = {};
    lesson.content = lesson.content.replace(TAGGED_FENCE, (_, lang, tag, arg, code) => {
      if (tag !== 'config') throw new Error(`${file}: only a json @config block is allowed in a lab`);
      Object.assign(config, JSON.parse(code));
      return '';
    }).trim();
    lesson.type = 'code_challenge';
    lesson.code_challenge_data = { language: 'devtools-lab', lab: config.lab || 'shop' };
  }
  if (file.endsWith('.challenge.md')) {
    const { content, data } = parseChallenge(lesson.content, file);
    lesson.type = 'code_challenge';
    lesson.content = content;
    lesson.code_challenge_data = data;
  }
  return lesson;
};

// Whole course as plain data: modules and lessons in order. `key` is the explicit id.
// With { requireIds: false } files without an id are allowed (scripts/assign-content-ids.js).
const readCourse = (courseDir, { requireIds = true } = {}) => {
  const meta = JSON.parse(fs.readFileSync(path.join(courseDir, 'course.json'), 'utf8'));
  const publicAssets = `/courses/${meta.slug}/`;
  const modulesDir = path.join(courseDir, 'modules');
  const problems = [];
  const seenIds = new Map();

  const checkId = (id, file) => {
    const name = path.relative(courseDir, file);
    if (!id) {
      problems.push(`${name}: нет id`);
    } else if (!ID_PATTERN.test(id)) {
      problems.push(`${name}: id "${id}" — допустимы строчные латинские буквы, цифры и дефис, 3–64 символа`);
    } else if (seenIds.has(id)) {
      problems.push(`${name}: id "${id}" уже используется в ${seenIds.get(id)}`);
    } else {
      seenIds.set(id, name);
    }
  };

  const modules = sortedEntries(modulesDir).map((dirName, moduleIndex) => {
    const moduleDir = path.join(modulesDir, dirName);
    const readmeFile = path.join(moduleDir, 'README.md');
    const { data: frontMatter, body: readmeText } = parseFrontMatter(fs.readFileSync(readmeFile, 'utf8'));
    const readme = splitTitle(readmeText, dirName);
    checkId(frontMatter.id, readmeFile);
    const legacyKey = legacyModuleKey(dirName);
    const lessonsDir = path.join(moduleDir, 'lessons');

    const lessons = sortedEntries(lessonsDir).map((fileName, lessonIndex) => {
      const file = path.join(lessonsDir, fileName);
      const lesson = readLesson(file, publicAssets);
      checkId(lesson.id, file);
      return {
        ...lesson,
        key: lesson.id,
        legacyKey: `${legacyKey}/${legacyLessonSlug(fileName)}`,
        file,
        order_index: lessonIndex + 1
      };
    });

    return {
      key: frontMatter.id,
      legacyKey,
      dirName,
      readmeFile,
      title: readme.title,
      description: readme.body.split(/\r?\n\r?\n/)[0],
      order_index: moduleIndex + 1,
      lessons
    };
  });

  const missingOnly = problems.every((p) => p.endsWith(': нет id'));
  if (problems.length && (requireIds || !missingOnly)) {
    const hint = missingOnly ? '\nДобавьте id командой: node scripts/assign-content-ids.js <папка курса>' : '';
    throw new Error(`Ошибки в id уроков и модулей:\n  ${problems.join('\n  ')}${hint}`);
  }

  return { meta, courseDir, modules, lessons: modules.flatMap((m) => m.lessons) };
};

// Links between lessons are written as ordinary relative Markdown links to the lesson
// file, e.g. [Структура автотеста](04-test-structure.md); they also work on GitHub.
// urlFor(lesson) returns the platform URL part used instead of the file path.
const resolveLessonLinks = (course, lesson, urlFor) =>
  lesson.content.replace(/\]\(([^)\s#]+\.md)(#[^)\s]*)?\)/g, (match, target, anchor = '') => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return match; // external URL
    const resolved = path.resolve(path.dirname(lesson.file), target);
    const linked = course.lessons.find((l) => l.file === resolved);
    if (!linked) {
      throw new Error(`${path.relative(course.courseDir, lesson.file)}: link "${target}" does not point to a lesson of this course`);
    }
    return `](${urlFor(linked)}${anchor})`;
  });

// Grades every reference solution with the same core the browser uses
const validateChallenges = async (course) => {
  const corePath = path.join(ROOT, 'frontend/src/utils/challengeCore.js');
  const { evaluateChallenge, isChallengePassed } = await import(pathToFileURL(corePath).href);

  for (const lesson of course.lessons.filter((l) => l.code_challenge_data?.language === 'javascript')) {
    const data = lesson.code_challenge_data;
    const name = path.relative(course.courseDir, lesson.file);
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

// Course images are served by the frontend from /courses/<slug>/
const copyAssets = (course) => {
  const assetsDir = path.join(course.courseDir, 'assets');
  if (!fs.existsSync(assetsDir)) return;
  const target = path.join(ROOT, 'frontend/public/courses', course.meta.slug);
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(assetsDir, target, { recursive: true });
};

module.exports = { ROOT, ID_PATTERN, parseFrontMatter, readCourse, resolveLessonLinks, validateChallenges, copyAssets };
