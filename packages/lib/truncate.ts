export function truncate(string: string, maxLength: number) {
  if (string.length > maxLength) {
    return string.substring(0, maxLength) + "…";
  }
  return string;
}
