import { Booking } from "@calcom/prisma/client";
import type { BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";

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

interface BookingWithWorkflowReminders {
  id: number;
  startTime: Date;
  endTime: Date;
  references: {
    uid: string;
    type: string;
    externalCalendarId: string | null;
    credentialId: number | null;
  }[];
  workflowReminders: {
    id: number;
    method: WorkflowMethods;
    referenceId: string | null;
  }[];
  uid: string;
}

export interface IBookingRepository {
  // ... Add existing methods as well here
  updateMany(params: { where: BookingWhereInput; data: BookingUpdateData }): Promise<{ count: number }>;

  update(params: { where: BookingWhereUniqueInput; data: BookingUpdateData }): Promise<Booking>;

  findManyIncludeWorkflowRemindersAndReferences(params: {
    where: BookingWhereInput;
  }): Promise<BookingWithWorkflowReminders[]>;
}
