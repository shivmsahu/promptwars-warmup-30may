export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatShortDate(date) {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDayLabel(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** e.g. 3 days → "2N3D" */
export function formatTripDuration(daysCount) {
  const nights = Math.max(0, daysCount - 1);
  return `${nights}N${daysCount}D`;
}

export function getTripEndDate(startDate, daysCount) {
  return addDays(new Date(startDate), daysCount - 1);
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
