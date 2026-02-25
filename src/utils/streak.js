function toIsoDay(dateLike) {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

export function calculateConsecutiveDailyStreak(items, dateExtractor, { maxLookbackDays = 365 } = {}) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  const days = new Set(items.map((item) => toIsoDay(dateExtractor(item))).filter(Boolean));
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < maxLookbackDays; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
