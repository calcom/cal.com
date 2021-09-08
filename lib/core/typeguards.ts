// Reference https://github.com/sindresorhus/is-plain-obj/blob/main/index.js
export function isPlainObject<T = unknown>(value: unknown): value is Record<string, T> {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

export function isEmptyPlainObject<T = unknown>(value: unknown): value is Record<never, T> {
  return isPlainObject<T>(value) && Object.entries(value).length === 0;
}
