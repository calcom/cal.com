export function safeStringify(obj: unknown) {
  try {
    // Avoid crashing on circular references
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
}
