/**
 * It stringifies the object which is necessary to ensure that in a logging system(like Axiom) we see the object in context in a single log event
 */
export function safeStringify(obj: unknown) {
  try {
    if (obj instanceof Error) {
      // Errors don't serialize well, so we extract what we want
      return obj.stack ?? obj.message;
    }
    // Avoid crashing on circular references
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
}
