export function getStartOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  next.setUTCDate(next.getUTCDate() - diffToMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

export function parseWeekStart(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const monday = getStartOfWeek(parsed);
  if (formatISODate(monday) !== value) {
    return null;
  }

  return parsed;
}

export function parseMonth(value: string): Date | null {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (formatISOMonth(parsed) !== value) {
    return null;
  }

  return parsed;
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatISOMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function getStartOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function shiftWeek(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount * 7);
  return next;
}

export function shiftMonth(date: Date, amount: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  next.setUTCMonth(next.getUTCMonth() + amount);
  return next;
}
