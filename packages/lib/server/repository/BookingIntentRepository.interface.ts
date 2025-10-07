import type { BookingIntent, Prisma } from "@calcom/prisma/client";

export interface BookingIntentAttendee {
  name: string;
  email: string;
  timeZone: string;
  phoneNumber: string | null;
}

export interface BookingIntentForViewing {
  id: number;
  uid: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  status: string;
  description: string | null;
  metadata: Prisma.JsonValue;
  responses: Prisma.JsonValue;
  organizerName: string;
  organizerEmail: string;
  attendees: BookingIntentAttendee[];
  eventTypeId: number | null;
  eventType: {
    eventName: string | null;
    slug: string;
    timeZone: string | null;
    schedulingType: string | null;
    hideOrganizerEmail: boolean;
  } | null;
}

export interface IBookingIntentRepository {
  create(data: Omit<Prisma.BookingIntentCreateInput, "uid">): Promise<BookingIntent>;
  getByUid(uid: string): Promise<BookingIntent | null>;
  getByUidForViewing(uid: string): Promise<BookingIntentForViewing | null>;
}
