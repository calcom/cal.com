import type { CalendarEvent, CalendarSyncPort } from "../CalendarSyncPort.interface";

export class GoogleCalendarSyncAdapter implements CalendarSyncPort {
  async pullEvents(): Promise<CalendarEvent[]> {
    return [];
  }
}
