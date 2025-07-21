export default function now(timeZone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Date().toLocaleString("en-US", {
    timeZone,
    ...options,
  });
}
