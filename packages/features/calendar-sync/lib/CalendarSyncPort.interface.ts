export type CalendarEvent = {
  uid: string;
};

export interface CalendarSyncPort {
  pullEvents(): Promise<CalendarEvent[]>;
}
