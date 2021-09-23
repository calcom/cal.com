export function asStringOrNull(str: unknown) {
  return typeof str === "string" ? str : null;
}

export function asStringOrThrow(str: unknown): string {
  const type = typeof str;
  if (type !== "string") {
    throw new Error(`Expected "string" - got ${type}`);
  }
  return str;
}
