/**
 * Recursively extracts serializable data from an Error, including the cause chain
 * and any custom enumerable properties (e.g. Prisma's `code`, `clientVersion`).
 */
function serializeError(err: Error, depth = 0): Record<string, unknown> {
  // Guard against deeply nested cause chains
  if (depth > 5) return { name: err.name, message: err.message };

  const serialized: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };

  // Include any custom enumerable properties (e.g. Prisma's code, clientVersion, meta)
  for (const key of Object.keys(err)) {
    if (key === "cause") continue; // handled separately below
    const descriptor = Object.getOwnPropertyDescriptor(err, key);
    if (descriptor) {
      serialized[key] = descriptor.value;
    }
  }

  // Access cause via property descriptor to avoid TS2550 in older ES targets
  const causeDescriptor = Object.getOwnPropertyDescriptor(err, "cause");
  const cause = causeDescriptor?.value as unknown;
  if (cause instanceof Error) {
    serialized.cause = serializeError(cause, depth + 1);
  } else if (cause !== undefined) {
    serialized.cause = cause;
  }

  return serialized;
}

/**
 * It stringifies the object which is necessary to ensure that in a logging system(like Axiom) we see the object in context in a single log event
 */
export function safeStringify(obj: unknown) {
  try {
    if (obj instanceof Error) {
      return JSON.stringify(serializeError(obj));
    }
    // Avoid crashing on circular references
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
}
