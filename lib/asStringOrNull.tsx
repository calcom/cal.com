export function asStringOrNull(str: unknown) {
  return typeof str === "string" ? str : null;
}
