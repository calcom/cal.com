export function safeStringify(obj: unknown) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
}
