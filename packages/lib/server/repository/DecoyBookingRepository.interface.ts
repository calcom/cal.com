import type { DecoyBooking, Prisma } from "@calcom/prisma/client";

export interface DecoyBookingForViewing {
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
  attendees: Prisma.JsonValue;
  eventTypeId: number | null;
  eventType: {
    eventName: string | null;
    slug: string;
    timeZone: string | null;
    schedulingType: string | null;
    hideOrganizerEmail: boolean;
  } | null;
}

export interface IDecoyBookingRepository {
  create(data: Omit<Prisma.DecoyBookingCreateInput, "uid">): Promise<DecoyBooking>;
  getByUid(uid: string): Promise<DecoyBooking | null>;
  getByUidForViewing(uid: string): Promise<DecoyBookingForViewing | null>;
}
