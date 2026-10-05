// Bootstrap badge classes and labels shared across views

const LEVELS = {
  beginner: { label: 'Начинающий', class: 'text-bg-success' },
  intermediate: { label: 'Средний', class: 'text-bg-warning' },
  advanced: { label: 'Продвинутый', class: 'text-bg-danger' }
};

const LESSON_TYPES = {
  text: { label: '📄 Текст', class: 'text-bg-info' },
  video: { label: '🎥 Видео', class: 'text-bg-danger' },
  quiz: { label: '❓ Тест', class: 'text-bg-warning' },
  code_challenge: { label: '💻 Практика', class: 'text-bg-success' }
};

export const levelLabel = (level) => LEVELS[level]?.label || level;
export const levelBadgeClass = (level) => LEVELS[level]?.class || 'text-bg-secondary';

export const lessonTypeLabel = (type) => LESSON_TYPES[type]?.label || type;
export const lessonTypeBadgeClass = (type) => LESSON_TYPES[type]?.class || 'text-bg-secondary';
