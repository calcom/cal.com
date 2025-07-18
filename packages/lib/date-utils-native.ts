export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfHour(date: Date): Date {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  return result;
}

export function diffInMinutes(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60));
}

export function diffInDays(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isAfter(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

export function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

export function max(date1: Date, date2: Date): Date {
  return date1.getTime() > date2.getTime() ? date1 : date2;
}

export function min(date1: Date, date2: Date): Date {
  return date1.getTime() < date2.getTime() ? date1 : date2;
}

export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

export function setTimeFromUTCTime(date: Date, utcTime: Date): Date {
  const result = new Date(date);
  result.setUTCHours(utcTime.getUTCHours(), utcTime.getUTCMinutes(), 0, 0);
  return result;
}

export function isBetween(date: Date, start: Date, end: Date, inclusivity = "()"): boolean {
  const dateTime = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();

  switch (inclusivity) {
    case "[]":
      return dateTime >= startTime && dateTime <= endTime;
    case "[)":
      return dateTime >= startTime && dateTime < endTime;
    case "(]":
      return dateTime > startTime && dateTime <= endTime;
    case "()":
    default:
      return dateTime > startTime && dateTime < endTime;
  }
}
