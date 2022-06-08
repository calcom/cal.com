import { DestinationCalendar } from "@prisma/client";

import { AdditionalInformation, CalendarEvent, ConferenceData, Person } from "@calcom/types/Calendar";

class CalendarEventClass implements CalendarEvent {
  type!: string;
  title!: string;
  startTime!: string;
  endTime!: string;
  organizer!: Person;
  attendees!: Person[];
  description?: string | null;
  team?: { name: string; members: string[] };
  location?: string | null;
  conferenceData?: ConferenceData;
  additionalInformation?: AdditionalInformation;
  uid?: string | null;
  videoCallData?: any;
  paymentInfo?: any;
  destinationCalendar?: DestinationCalendar | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  hideCalendarNotes?: boolean;
  additionalNotes?: string | null | undefined;
  recurrence?: string;

  constructor(initProps?: CalendarEvent) {
    // If more parameters are given we update this
    Object.assign(this, initProps);
  }
}

export { CalendarEventClass };
