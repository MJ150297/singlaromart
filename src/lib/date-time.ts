const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;

export type DateInput = Date | string | number;

/** Parse a date-like value without silently accepting an invalid date. */
export function parseDate(value: DateInput | null | undefined): Date | null {
  if (value == null) return null;

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format an absolute instant using the India Standard Time calendar/timezone. */
export function formatIST(
  value: DateInput | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-IN", {
    ...options,
    timeZone: IST_TIME_ZONE,
  }).format(date);
}

/** Return the IST calendar date for an absolute instant as YYYY-MM-DD. */
export function getISTDateKey(value: DateInput | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Return consecutive IST calendar dates ending with today. */
export function getISTDateKeys(days: number, now: DateInput = new Date()): string[] {
  if (!Number.isInteger(days) || days < 1) return [];

  const today = getISTDateKey(now);
  if (!today) return [];

  return Array.from({ length: days }, (_, index) => shiftDateKey(today, index - days + 1));
}

/** Convert an IST calendar date to the corresponding UTC instant at IST midnight. */
export function istDateKeyToUTCStart(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error(`Invalid IST date key: ${dateKey}`);

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - IST_OFFSET_MINUTES * 60_000);
}

/** Get a UTC query range covering the requested number of IST calendar days. */
export function getISTDayRange(
  days: number,
  now: DateInput = new Date()
): { from: Date; to: Date; dateKeys: string[] } {
  const dateKeys = getISTDateKeys(days, now);
  if (dateKeys.length === 0) throw new Error("Days must be a positive integer");

  return {
    from: istDateKeyToUTCStart(dateKeys[0]),
    to: parseDate(now) ?? new Date(),
    dateKeys,
  };
}
