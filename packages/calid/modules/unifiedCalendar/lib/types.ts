export type CalendarProvider = "google" | "outlook";

export interface CalendarSource {
  id: string;
  name: string;
  provider: CalendarProvider;
  email: string;
  color: string;
  visible: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  calendarId: string;
  location?: string;
  meetingLink?: string;
  attendees: string[];
  description?: string;
}

export type ViewMode = "day" | "week" | "month";

export interface QuickBookSlot {
  date: Date;
  hour: number;
}
