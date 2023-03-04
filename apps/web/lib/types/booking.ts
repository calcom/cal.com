import type { Attendee, Booking } from "@prisma/client";

import type { AppsStatus } from "@calcom/types/Calendar";

export type BookingResponse = Booking & {
  paymentUid?: string;
  attendees: Attendee[];
  appsStatus?: AppsStatus[];
};
