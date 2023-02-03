import { Attendee, Booking } from "@prisma/client";

import { AppsStatus } from "@calcom/types/Calendar";

export type BookingCreateBody = {
  end: string;
  web3Details?: {
    userWallet: string;
    userSignature: unknown;
  };
  eventTypeId: number;
  eventTypeSlug: string;
  rescheduleUid?: string;
  recurringEventId?: string;
  start: string;
  timeZone: string;
  user?: string | string[];
  language: string;
  bookingUid?: string;
  metadata: {
    [key: string]: string;
  };
  hasHashedBookingLink: boolean;
  hashedLink?: string | null;
  ethSignature?: string;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
  attendees: Attendee[];
  appsStatus?: AppsStatus[];
};
