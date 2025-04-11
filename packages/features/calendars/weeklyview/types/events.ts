import type { BookingStatus } from "@calcom/prisma/enums";

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start: Date | string; // You can pass in a string from DB since we use dayjs for the dates.
  end: Date;
  source?: string;
  options?: {
    status?: BookingStatus;
    hideTime?: boolean;
    allDay?: boolean;
    borderColor?: string;
    className?: string;
    "data-test-id"?: string;
    beforeEventBuffer?: number; // Minutes of buffer time before the event
    afterEventBuffer?: number; // Minutes of buffer time after the event
    isBuffer?: boolean; // Whether this event is a buffer segment
    isPreBuffer?: boolean; // Whether this is a pre-event buffer
    isPostBuffer?: boolean; // Whether this is a post-event buffer
  };
}
