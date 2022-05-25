import { Attendee, Booking } from "@prisma/client";

export type BookingConfirmBody = {
  confirmed: boolean;
  id: number;
};

export type BookingCreateBody = {
  email: string;
  end: string;
  web3Details?: {
    userWallet: string;
    userSignature: unknown;
  };
  eventTypeId: number;
  eventTypeSlug: string;
  guests?: string[];
  location: string;
  name: string;
  notes?: string;
  rescheduleUid?: string;
  recurringEventId?: string;
  start: string;
  timeZone: string;
  user?: string | string[];
  language: string;
  bookingUid?: string;
  customInputs: { label: string; value: string | boolean }[];
  metadata: {
    [key: string]: string;
  };
  hasHashedBookingLink: boolean;
  hashedLink?: string | null;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
  attendees: Attendee[];
};
