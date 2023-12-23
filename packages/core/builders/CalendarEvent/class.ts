import type { DestinationCalendar } from "@prisma/client";

import type {
  AdditionalInformation,
  CalendarEvent,
  ConferenceData,
  Person,
  VideoCallData,
} from "@calcom/types/Calendar";

class CalendarEventClass implements CalendarEvent {
  bookerUrl?: string | undefined;
  type!: string;
  title!: string;
  startTime!: string;
  endTime!: string;
  organizer!: Person;
  attendees!: Person[];
  description?: string | null;
  team?: { name: string; members: Person[]; id: number };
  location?: string | null;
  conferenceData?: ConferenceData;
  additionalInformation?: AdditionalInformation;
  uid?: string | null;
  videoCallData?: VideoCallData;
  paymentInfo?: any;
  destinationCalendar?: DestinationCalendar[] | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  hideCalendarNotes?: boolean;
  additionalNotes?: string | null | undefined;
  recurrence?: string;
  iCalUID?: string | null;

  constructor(initProps?: CalendarEvent) {
    // If more parameters are given we update this
    Object.assign(this, initProps);
  }
}

export { CalendarEventClass };
