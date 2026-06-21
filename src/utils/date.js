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
