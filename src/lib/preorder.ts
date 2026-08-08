/**
 * Kookie Queen ordering window.
 * Pre-orders open Saturday through Wednesday. The form closes Thursday and
 * Friday, and reopens the following Saturday. All orders deliver on Sunday.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Sat(6), Sun(0), Mon(1), Tue(2), Wed(3)
const OPEN_DAYS = new Set([6, 0, 1, 2, 3]);

export function isPreorderOpen(date: Date = new Date()) {
  return OPEN_DAYS.has(date.getDay());
}

/** Number of days until pre-orders open again (0 when already open). */
export function daysUntilOpen(date: Date = new Date()) {
  if (isPreorderOpen(date)) return 0;
  let d = 0;
  while (d < 7) {
    d += 1;
    if (OPEN_DAYS.has((date.getDay() + d) % 7)) return d;
  }
  return 0;
}

export function preorderStatus(date: Date = new Date()) {
  const open = isPreorderOpen(date);
  const days = daysUntilOpen(date);
  return {
    open,
    today: DAY_NAMES[date.getDay()],
    daysUntilOpen: days,
    reopensLabel: days === 1 ? "tomorrow (Saturday)" : "this Saturday",
  };
}

export const PREORDER_NOTE =
  "Pre-orders only — open Saturday to Wednesday, with delivery every Sunday.";
