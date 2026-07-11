/**
 * Safely parse a route parameter as a positive integer.
 * Returns null if the value is missing, non-numeric, or <= 0.
 */
export function parseId(param: string | undefined): number | null {
  if (!param) return null;
  const id = parseInt(param, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
}
