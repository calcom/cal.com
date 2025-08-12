/**
 * Ensures a value is either a string or string array.
 * Converts numbers to strings.
 *
 * @param value - The value to normalize
 * @returns String or string array
 */

export function ensureStringOrStringArray(value: string | number | (string | number)[]): string | string[] {
  if (typeof value === "string") {
    return value;
  } else if (value instanceof Array) {
    return value.map((v) => v.toString());
  }
  return [value.toString()];
}
