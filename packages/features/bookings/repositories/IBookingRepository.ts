import type { BookingForCalEventBuilder } from "@calcom/features/CalendarEventBuilder";
import type { Booking } from "@calcom/prisma/client";
import type { BookingStatus } from "@calcom/prisma/enums";

export interface BookingWhereInput {
  id?: number;
  uid?: string;
  recurringEventId?: string | null;
  startTime?: {
    gte?: Date;
  };
}

export type BookingWhereUniqueInput =
  | {
      id: number;
    }
  | {
      uid: string;
    };

export interface BookingUpdateData {
  status?: BookingStatus;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  iCalSequence?: number;
}

interface BookingWithReferences {
  id: number;
  startTime: Date;
  endTime: Date;
  references: {
    uid: string;
    type: string;
    externalCalendarId: string | null;
    credentialId: number | null;
  }[];
  uid: string;
}

export interface IBookingRepository {
  // ... Add existing methods as well here
  updateMany(params: { where: BookingWhereInput; data: BookingUpdateData }): Promise<{ count: number }>;

  update(params: { where: BookingWhereUniqueInput; data: BookingUpdateData }): Promise<Booking>;

  findManyIncludeReferences(params: {
    where: BookingWhereInput;
  }): Promise<BookingWithReferences[]>;

  getBookingForCalEventBuilderFromUid(bookingUid: string): Promise<BookingForCalEventBuilder | null>;
}
