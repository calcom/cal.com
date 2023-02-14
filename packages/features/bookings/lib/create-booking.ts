// @TODO: Abstract fetch wrapper?
import { post } from "@calcom/lib/fetch-wrapper";
import { Attendee, Booking } from "@calcom/prisma/client";
import { AppsStatus } from "@calcom/types/Calendar";

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
  smsReminderNumber?: string;
  ethSignature?: string;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
  attendees: Attendee[];
  appsStatus?: AppsStatus[];
};

const createBooking = async (data: BookingCreateBody) => {
  const response = await post<BookingCreateBody, BookingResponse>("/api/book/event", data);

  return response;
};

export default createBooking;
