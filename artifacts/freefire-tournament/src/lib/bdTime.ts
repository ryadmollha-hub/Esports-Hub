/**
 * Bangladesh time utilities — self-contained, no external packages.
 *
 * Bangladesh Standard Time = UTC+6 (Asia/Dhaka). No daylight saving — offset is permanent.
 *
 * WHY THIS FILE EXISTS
 * `new Date(naiveString).getTime()` uses the JavaScript runtime's local timezone.
 * When this project runs on any server or browser outside Bangladesh (e.g. Replit
 * containers in UTC, or users in other timezones), timezone-naive date strings like
 * "2024-01-01T18:00:00" are misinterpreted — making countdown timers and status checks
 * wrong by up to 6 hours, regardless of where the app is deployed.
 *
 * This file forces every date comparison to be anchored to UTC+6, permanently,
 * no matter which server, container, account, or browser environment the code runs in.
 *
 * RULE: never call `new Date(someString)` directly outside this file.
 * Always use parseBDDate(someString) so the intent is explicit and immune to environment drift.
 */

const BD_SUFFIX = "+06:00";

/**
 * Parse a date string treating timezone-naive strings as Bangladesh time (UTC+6).
 *
 * - If the string already carries an explicit timezone (Z or ±HH:MM suffix), parse as-is.
 * - If the string is timezone-naive (no suffix), append +06:00 so it is interpreted
 *   as Bangladesh Standard Time regardless of the runtime environment.
 * - If a Date object is passed, return it unchanged.
 */
export function parseBDDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  const s = dateStr.trim();
  if (!s) return new Date(NaN);
  // Already has explicit timezone info — respect it
  if (/Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(s);
  }
  // Naive string — stamp Bangladesh offset so it is never misread
  return new Date(s + BD_SUFFIX);
}

/**
 * Milliseconds from now until the target date.
 * Positive  = target is in the future (countdown still running).
 * Negative  = target is in the past   (countdown expired).
 *
 * Uses Date.now() which is always UTC epoch milliseconds — timezone-agnostic.
 */
export function msUntilBD(dateStr: string | Date): number {
  return parseBDDate(dateStr).getTime() - Date.now();
}

/**
 * Format a date/datetime for display in Bangladesh time using the Intl API.
 * Works identically on any server or browser locale — never reads system timezone.
 *
 * @param date   Date object or any date string (passed through parseBDDate first).
 * @param opts   Standard Intl.DateTimeFormatOptions. Defaults to HH:MM time only.
 */
export function formatBDTime(
  date: Date | string,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
): string {
  const d = typeof date === "string" ? parseBDDate(date) : date;
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    ...opts,
  }).format(d);
}

/** "Jan 1, 2024" in Bangladesh time */
export function formatBDDate(date: Date | string): string {
  return formatBDTime(date, { day: "numeric", month: "short", year: "numeric" });
}

/** "Jan 1 · 6:00 PM" in Bangladesh time */
export function formatBDDateTime(date: Date | string): string {
  return formatBDTime(date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
