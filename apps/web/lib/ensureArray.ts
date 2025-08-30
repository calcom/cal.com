export function ensureArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) {
    return val;
  }
  if (typeof val === "undefined") {
    return [];
  }
  return [val] as T[];
}
