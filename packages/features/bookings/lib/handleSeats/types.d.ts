import type { Prisma } from "@prisma/client";
import type z from "zod";

import type { AppsStatus } from "@calcom/types/Calendar";

import type { Booking, NewBookingEventType, OriginalRescheduledBooking } from "../handleNewBooking";

export type BookingSeat = Prisma.BookingSeatGetPayload<{ include: { booking: true; attendee: true } }> | null;

export type NewSeatedBookingObject = {
  rescheduleUid: string | undefined;
  reqBookingUid: string | undefined;
  eventType: NewBookingEventType;
  evt: CalendarEvent;
  invitee: Invitee;
  allCredentials: Awaited<ReturnType<typeof getAllCredentials>>;
  organizerUser: OrganizerUser;
  originalRescheduledBooking: OriginalRescheduledBooking;
  bookerEmail: string;
  tAttendees: TFunction;
  bookingSeat: BookingSeat;
  reqUserId: number | undefined;
  rescheduleReason: RescheduleReason;
  reqBodyUser: string | string[] | undefined;
  noEmail: NoEmail;
  isConfirmedByDefault: IsConfirmedByDefault;
  additionalNotes: AdditionalNotes;
  reqAppsStatus: ReqAppsStatus;
  attendeeLanguage: string | null;
  paymentAppData: PaymentAppData;
  fullName: ReturnType<typeof getFullName>;
  smsReminderNumber: SmsReminderNumber;
  eventTypeInfo: EventTypeInfo;
  uid: short.SUUID;
  eventTypeId: EventTypeId;
  reqBodyMetadata: ReqBodyMetadata;
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: WebhookTriggerEvents;
  responses: z.infer<ReturnType<typeof getBookingDataSchema>>["responses"] | null;
};

export type RescheduleSeatedBookingObject = NewSeatedBookingObject & { rescheduleUid: string };

export type SeatedBooking = Prisma.BookingGetPayload<{
  select: {
    uid: true;
    id: true;
    attendees: { include: { bookingSeat: true } };
    userId: true;
    references: true;
    startTime: true;
    user: true;
    status: true;
    smsReminderNumber: true;
    endTime: true;
  };
}>;

export type HandleSeatsResultBooking =
  | (Partial<Booking> & {
      appsStatus?: AppsStatus[];
      seatReferenceUid?: string;
      paymentUid?: string;
      message?: string;
      paymentId?: number;
    })
  | null;

export type NewTimeSlotBooking = Prisma.BookingGetPayload<{
  select: {
    id: true;
    uid: true;
    attendees: {
      include: {
        bookingSeat: true;
      };
    };
  };
}>;

export type SeatAttendee = Partial<Person>;
