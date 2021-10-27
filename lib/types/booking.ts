import { Booking } from "@prisma/client";

import { LocationType } from "@lib/location";

export type BookingConfirmBody = {
  confirmed: boolean;
  id: number;
};

export type BookingCreateBody = {
  email: string;
  end: string;
  eventTypeId: number;
  guests: string[];
  location: LocationType;
  name: string;
  notes: string;
  rescheduleUid?: string;
  start: string;
  timeZone: string;
  users?: string[];
  user?: string;
  language: string;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
};
