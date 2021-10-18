export function asStringOrNull(str: unknown) {
  return typeof str === "string" ? str : null;
}

export function asStringOrUndefined(str: unknown) {
  return typeof str === "string" ? str : undefined;
}

export function asNumberOrUndefined(str: unknown) {
  return typeof str === "string" ? parseInt(str) : undefined;
}

export function asNumberOrThrow(str: unknown) {
  return parseInt(asStringOrThrow(str));
}

export function asStringOrThrow(str: unknown): string {
  if (typeof str !== "string") {
    throw new Error(`Expected "string" - got ${typeof str}`);
  }
  return str;
}
