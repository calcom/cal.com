import type {
  BookingBasicDto,
  BookingBatchUpdateResultDto,
  BookingExistsDto,
  BookingForConfirmationDto,
  BookingFullContextDto,
  BookingInstantLocationDto,
  BookingUpdateResultDto,
  UpdateLocationInput,
} from "@calcom/lib/dto/BookingDto";
import type { Booking } from "@calcom/prisma/client";
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
  findByUid(params: { bookingUid: string }): Promise<BookingBasicDto | null>;

  findAcceptedByUid(params: { bookingUid: string }): Promise<BookingInstantLocationDto | null>;

  countSeatsByReferenceUid(params: { referenceUid: string }): Promise<number | null>;

  findByIdForAdminIncludeFullContext(params: {
    bookingId: number;
    adminUserId: number;
  }): Promise<BookingFullContextDto | null>;

  findByIdForOrganizerOrCollectiveMemberIncludeFullContext(params: {
    bookingId: number;
    userId: number;
  }): Promise<BookingFullContextDto | null>;

  findByIdForConfirmation(params: { bookingId: number }): Promise<BookingForConfirmationDto>;

  updateStatusToAccepted(params: { bookingId: number }): Promise<BookingUpdateResultDto>;

  existsByRecurringEventId(params: {
    recurringEventId: string;
    bookingId: number;
  }): Promise<BookingExistsDto | null>;

  countByRecurringEventId(params: { recurringEventId: string }): Promise<number>;

  findPendingByRecurringEventId(params: {
    recurringEventId: string;
  }): Promise<{ uid: string; status: string }[]>;

  rejectByUids(params: { uids: string[]; rejectionReason?: string }): Promise<BookingBatchUpdateResultDto>;

  rejectAllPendingByRecurringEventId(params: {
    recurringEventId: string;
    rejectionReason?: string;
  }): Promise<BookingBatchUpdateResultDto>;

  rejectById(params: { bookingId: number; rejectionReason?: string }): Promise<BookingUpdateResultDto>;

  updateLocationById(params: UpdateLocationInput): Promise<void>;

  updateMany(params: { where: BookingWhereInput; data: BookingUpdateData }): Promise<{ count: number }>;

  update(params: { where: BookingWhereUniqueInput; data: BookingUpdateData }): Promise<Booking>;

  findManyIncludeWorkflowRemindersAndReferences(params: {
    where: BookingWhereInput;
  }): Promise<BookingWithWorkflowReminders[]>;
}
