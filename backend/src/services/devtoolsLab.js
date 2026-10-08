const crypto = require('crypto');

// DevTools lab: a mock shop page with clues that can only be found with browser
// developer tools. Every student gets their own values, derived from their id and a
// server secret, so answers cannot be shared and the server can always recompute them.

const LAB_LANGUAGE = 'devtools-lab';

const isLabLesson = (lesson) =>
  lesson?.type === 'code_challenge' && lesson.code_challenge_data?.language === LAB_LANGUAGE;

const derive = (userId, lessonId, key, length) =>
  crypto
    .createHmac('sha256', `devtools-lab:${process.env.JWT_SECRET || 'development'}`)
    .update(`${userId}:${lessonId}:${key}`)
    .digest('hex')
    .slice(0, length)
    .toUpperCase();

// What the page shows (hidden somewhere) for this student
const getClues = (userId, lessonId) => ({
  promo: `EDU-${derive(userId, lessonId, 'promo', 6)}`,
  console_code: `PAY-${derive(userId, lessonId, 'console', 4)}`,
  storage_token: `ct_${derive(userId, lessonId, 'storage', 12).toLowerCase()}`,
  mobile_code: `APP-${derive(userId, lessonId, 'mobile', 4)}`,
  request_id: `req_${derive(userId, lessonId, 'request', 10).toLowerCase()}`,
  debug_token: `dbg-${derive(userId, lessonId, 'header', 8).toLowerCase()}`
});

const REVIEWS_STATUS = 503;

// Tasks in display order: the answer form is built from this list
const TASKS = [
  {
    key: 'promo',
    panel: 'Elements',
    label: 'Промокод из скрытого блока на странице магазина',
    hint: 'Во вкладке Elements найдите элемент с классом d-none внутри карточки магазина.'
  },
  {
    key: 'console_code',
    panel: 'Console',
    label: 'Код ошибки, которая появляется в консоли после нажатия «Оформить заказ»',
    hint: 'Откройте вкладку Console и нажмите «Оформить заказ» ещё раз: код в квадратных скобках.'
  },
  {
    key: 'reviews_status',
    panel: 'Network',
    label: 'Код статуса ответа на запрос отзывов',
    hint: 'Во вкладке Network нажмите «Загрузить отзывы» и найдите запрос reviews: столбец Status.'
  },
  {
    key: 'request_id',
    panel: 'Network',
    label: 'Значение request_id из тела ответа на запрос отзывов',
    hint: 'Выберите запрос reviews во вкладке Network и откройте Response (или Preview).'
  },
  {
    key: 'debug_token',
    panel: 'Network',
    label: 'Значение заголовка ответа X-Debug-Token',
    hint: 'Тот же запрос reviews, раздел Headers → Response Headers.'
  },
  {
    key: 'storage_token',
    panel: 'Application',
    label: 'Значение ключа cart_token в Local Storage',
    hint: 'Вкладка Application (в Firefox — Storage) → Local Storage → адрес сайта.'
  },
  {
    key: 'mobile_code',
    panel: 'Device toolbar',
    label: 'Код из баннера, который виден только на экране телефона',
    hint: 'Включите режим устройства (Toggle device toolbar) и выберите ширину меньше 576 px.'
  }
];

const expectedAnswers = (userId, lessonId) => {
  const clues = getClues(userId, lessonId);
  return { ...clues, reviews_status: String(REVIEWS_STATUS) };
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

// Per-task result without revealing the expected values
const checkAnswers = (userId, lessonId, answers = {}) => {
  const expected = expectedAnswers(userId, lessonId);
  const results = TASKS.map((task) => {
    const correct = normalize(answers[task.key]) === normalize(expected[task.key]);
    return { key: task.key, correct, hint: correct ? null : task.hint };
  });
  return { passed: results.every((r) => r.correct), results };
};

module.exports = { LAB_LANGUAGE, REVIEWS_STATUS, TASKS, isLabLesson, getClues, checkAnswers };
