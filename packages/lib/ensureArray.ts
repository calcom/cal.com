export function ensureArray<T>(val: T | T[] | undefined) {
  if (Array.isArray(val)) {
    return val;
  }
  if (typeof val === "undefined") {
    return [] as T[];
  }
  return [val];
}
