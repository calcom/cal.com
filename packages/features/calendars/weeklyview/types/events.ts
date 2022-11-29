import { BookingStatus } from "@calcom/prisma/client";

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date | string; // You can pass in a string from DB since we use dayjs for the dates.
  end: Date;
  allDay?: boolean;
  source?: string;
  status?: BookingStatus;
}
