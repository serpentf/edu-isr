// Date helpers for Russian UI

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const relative = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

// "сегодня", "вчера", "3 дня назад", "2 недели назад"
export const formatRelative = (value) => {
  if (!value) return '—';
  const days = Math.round((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days > -7) return relative.format(days, 'day');
  if (days > -60) return relative.format(Math.round(days / 7), 'week');
  return formatDate(value);
};
