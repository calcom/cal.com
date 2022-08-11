/** @deprecated use zod instead  */
export function asStringOrNull(str: unknown) {
  return typeof str === "string" ? str : null;
}

/** @deprecated use zod instead  */
export function asStringOrUndefined(str: unknown) {
  return typeof str === "string" ? str : undefined;
}

/** @deprecated use zod instead  */
export function asNumberOrUndefined(str: unknown) {
  return typeof str === "string" ? parseInt(str) : undefined;
}

/** @deprecated use zod instead  */
export function asNumberOrThrow(str: unknown) {
  return parseInt(asStringOrThrow(str));
}

/** @deprecated use zod instead  */
export function asStringOrThrow(str: unknown): string {
  if (typeof str !== "string") {
    throw new Error(`Expected "string" - got ${typeof str}`);
  }
  return str;
}
