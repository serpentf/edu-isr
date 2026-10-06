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
