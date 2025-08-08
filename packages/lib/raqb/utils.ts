export function caseInsensitive<T extends string | string[]>(
  stringOrStringArray: T
): T extends string[] ? string[] : string {
  return (
    stringOrStringArray instanceof Array
      ? stringOrStringArray.map((string) => string.toLowerCase())
      : stringOrStringArray.toLowerCase()
  ) as T extends string[] ? string[] : string;
}