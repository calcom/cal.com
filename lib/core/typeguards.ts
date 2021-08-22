export function isNonEmptyString(value: unknown, trim = true): value is string {
  return typeof value === "string" && (trim ? value.trim() : value).length > 0;
}
