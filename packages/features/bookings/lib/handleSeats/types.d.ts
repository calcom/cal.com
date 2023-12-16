import type { Prisma } from "@prisma/client";

export type BookingSeat = Prisma.BookingSeatGetPayload<{ include: { booking: true; attendee: true } }> | null;

export type NewSeatedBookingObject = {
  rescheduleUid: string;
  reqBookingUid: string;
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
};

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
    scheduledJobs: true;
  };
}>;
