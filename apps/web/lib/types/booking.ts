import { Attendee, Booking } from "@prisma/client";

import { WorkingHours } from "./schedule";

export type BookingConfirmBody = {
  confirmed: boolean;
  id: number;
};

export type DisposableBookingObject = {
  slug?: string;
  link?: string;
};

export type DisposableLinkCreateBody = {
  eventTypeId: number;
  slug: string;
  user?: string | string[];
  timeZone: string;
  availability?: { openingHours: WorkingHours[]; dateOverrides: WorkingHours[] };
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
  start: string;
  timeZone: string;
  user?: string | string[];
  language: string;
  customInputs: { label: string; value: string }[];
  metadata: {
    [key: string]: string;
  };
  isDisposableBookingLink: boolean;
  disposableBookingObject: DisposableBookingObject;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
  attendees: Attendee[];
};
