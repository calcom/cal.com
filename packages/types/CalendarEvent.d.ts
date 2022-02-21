import type { DestinationCalendar } from "@prisma/client";
import type { calendar_v3 } from "googleapis";

export interface ConferenceData {
  createRequest?: calendar_v3.Schema$CreateConferenceRequest;
}

export interface AdditionInformation {
  conferenceData?: ConferenceData;
  entryPoints?: EntryPoint[];
  hangoutLink?: string;
}

export interface CalendarEvent {
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  team?: {
    name: string;
    members: string[];
  };
  location?: string | null;
  organizer: Person;
  attendees: Person[];
  conferenceData?: ConferenceData;
  additionInformation?: AdditionInformation;
  uid?: string | null;
  videoCallData?: VideoCallData;
  paymentInfo?: PaymentInfo | null;
  destinationCalendar?: DestinationCalendar | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
}
