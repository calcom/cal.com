/**
 * Utility class for Calendar Batch Service
 * Should serve as provide customizable config per calendar type
 */

export class CalendarBatchService {
  static isCalendarTypeSupported(type: string | null): boolean {
    if (!type) return false;
    return ["google_calendar"].includes(type);
  }
}
