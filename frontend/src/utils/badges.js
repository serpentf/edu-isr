// Bootstrap badge classes, labels and Bootstrap Icons shared across views

const LEVELS = {
  beginner: { label: 'Начинающий', class: 'text-bg-success' },
  intermediate: { label: 'Средний', class: 'text-bg-warning' },
  advanced: { label: 'Продвинутый', class: 'text-bg-danger' }
};

const LESSON_TYPES = {
  text: { label: 'Текст', class: 'text-bg-info', icon: 'bi-file-earmark-text' },
  video: { label: 'Видео', class: 'text-bg-danger', icon: 'bi-play-btn' },
  quiz: { label: 'Тест', class: 'text-bg-warning', icon: 'bi-patch-question' },
  code_challenge: { label: 'Практика', class: 'text-bg-success', icon: 'bi-code-slash' }
};

export const levelLabel = (level) => LEVELS[level]?.label || level;
export const levelBadgeClass = (level) => LEVELS[level]?.class || 'text-bg-secondary';

export const lessonTypeLabel = (type) => LESSON_TYPES[type]?.label || type;
export const lessonTypeBadgeClass = (type) => LESSON_TYPES[type]?.class || 'text-bg-secondary';
export const lessonTypeIcon = (type) => LESSON_TYPES[type]?.icon || 'bi-file-earmark';

// Student status in a course (admin statistics). Colour always comes with an icon and a label.
const STUDENT_STATUSES = {
  in_progress: { label: 'В процессе', class: 'text-bg-primary', icon: 'bi-hourglass-split' },
  completed: { label: 'Требования выполнены', class: 'text-bg-info', icon: 'bi-check2-circle' },
  certified: { label: 'Сертификат получен', class: 'text-bg-success', icon: 'bi-award' },
  revoked: { label: 'Сертификат отозван', class: 'text-bg-danger', icon: 'bi-x-octagon' }
};

export const STUDENT_STATUS_OPTIONS = Object.entries(STUDENT_STATUSES).map(([value, s]) => ({ value, label: s.label }));
export const studentStatus = (status) =>
  STUDENT_STATUSES[status] || { label: status, class: 'text-bg-secondary', icon: 'bi-question-circle' };
