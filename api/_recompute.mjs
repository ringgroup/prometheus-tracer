// Recompute the "day" axis after any change. Day 0 = the earliest dated event
// (a reading OR an injection), so a pin logged before the first weigh-in still
// anchors the timeline correctly. Used by both readings + milestones endpoints.
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function recompute(data) {
  data.rows = data.rows || [];
  data.milestones = data.milestones || [];
  const dates = [...data.rows.map((r) => r.date), ...data.milestones.map((m) => m.date)].filter(
    Boolean,
  );
  data.start = dates.length
    ? dates.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a))
    : null;
  data.rows.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  data.milestones.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (data.start) {
    data.rows.forEach((r) => (r.day = daysBetween(data.start, r.date)));
    data.milestones.forEach((m) => (m.day = daysBetween(data.start, m.date)));
  }
  return data;
}
