/** Day-bucket a date by its UTC calendar date. */
export function dayStart(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

/** { start, end } covering the UTC calendar day of `d` (end exclusive). */
export function dayRange(d) {
  const start = dayStart(d);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** { start, end } covering the UTC calendar month of `d` (end exclusive). */
export function monthRange(d) {
  const dt = new Date(d);
  const start = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}
