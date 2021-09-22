import { LocationType } from "@lib/location";
import { Booking } from "@prisma/client";

export type BookingCreateBody = {
  email: string;
  end: string;
  eventTypeId: number;
  guests: string[];
  location?: LocationType;
  name: string;
  notes: string;
  rescheduleUid?: string;
  start: string;
  timeZone: string;
  users?: string[];
  user?: string;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
};
