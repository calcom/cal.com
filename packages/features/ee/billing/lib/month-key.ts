export function formatMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonthKey(value: string): boolean {
  return MONTH_KEY_REGEX.test(value);
}
