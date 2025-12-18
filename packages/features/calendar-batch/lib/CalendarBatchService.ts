export class CalendarBatchService {
  static isCalendarTypeSupported(type: string | null): boolean {
    if (!type) return false;
    return ["google_calendar"].includes(type);
  }
}
