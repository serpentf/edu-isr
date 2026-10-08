#!/usr/bin/env node
// Adds an explicit id to every module README and lesson file of a course that has none.
// Existing ids are never changed: they link files to records in the database.
// Usage: node scripts/assign-content-ids.js <course-dir>

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readCourse, parseFrontMatter } = require('./lib/course-source');

const courseDir = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(courseDir, 'course.json'))) {
  console.error('Usage: node scripts/assign-content-ids.js <course-dir>');
  process.exit(1);
}

const course = readCourse(courseDir, { requireIds: false });
const used = new Set([...course.modules.map((m) => m.key), ...course.lessons.map((l) => l.key)].filter(Boolean));

const newId = (prefix) => {
  let id;
  do id = `${prefix}-${crypto.randomBytes(4).toString('hex')}`; while (used.has(id));
  used.add(id);
  return id;
};

// Markdown: add `id:` to existing front matter or prepend a new block
const addToMarkdown = (file, id) => {
  const text = fs.readFileSync(file, 'utf8');
  const { body } = parseFrontMatter(text);
  const updated = body === text
    ? `---\nid: ${id}\n---\n\n${text}`
    : text.replace(/^---\r?\n/, `---\nid: ${id}\n`);
  fs.writeFileSync(file, updated);
};

// JSON: insert the field textually after the opening brace to keep the file's formatting
const addToJson = (file, id) => {
  const text = fs.readFileSync(file, 'utf8');
  const indent = text.match(/\{\s*\n([ \t]+)"/)?.[1] || '  ';
  fs.writeFileSync(file, text.replace('{', `{\n${indent}"id": "${id}",`));
  JSON.parse(fs.readFileSync(file, 'utf8')); // still valid JSON
};

const assigned = [];
for (const module of course.modules) {
  if (!module.key) {
    const id = newId('mod');
    addToMarkdown(module.readmeFile, id);
    assigned.push([id, module.readmeFile]);
  }
  for (const lesson of module.lessons) {
    if (lesson.key) continue;
    const id = newId('les');
    if (lesson.file.endsWith('.json')) addToJson(lesson.file, id);
    else addToMarkdown(lesson.file, id);
    assigned.push([id, lesson.file]);
  }
}

for (const [id, file] of assigned) console.log(`${id}  ${path.relative(courseDir, file)}`);
console.log(assigned.length ? `\nДобавлено id: ${assigned.length}. Закоммитьте эти файлы.` : 'У всех модулей и уроков уже есть id.');
