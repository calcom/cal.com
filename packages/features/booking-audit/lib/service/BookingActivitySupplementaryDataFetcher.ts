import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { ReminderType } from "@calcom/prisma/enums";

export type BookingActivityReminderRecord = {
  id: number;
  reminderType: ReminderType;
  elapsedMinutes: number;
  createdAt: Date;
};

export type BookingActivityIntegrationRecord = {
  id: number;
  type: string;
  uid: string;
  meetingUrl: string | null;
  meetingId: string | null;
  externalCalendarId: string | null;
  deleted: boolean | null;
};

export type BookingActivityPaymentRecord = {
  id: number;
  uid: string;
  appId: string | null;
  amount: number;
  fee: number;
  currency: string;
  success: boolean;
  refunded: boolean;
  externalId: string;
  paymentOption: string | null;
};

export type BookingActivitySupplementaryData = {
  bookingId: number;
  bookingUid: string;
  createdAt: Date;
  updatedAt: Date | null;
  creationSource: string | null;
  status: string;
  hasCreatedAuditLog: boolean;
  reminders: BookingActivityReminderRecord[];
  integrations: BookingActivityIntegrationRecord[];
  payments: BookingActivityPaymentRecord[];
};

interface BookingActivitySupplementaryDataFetcherDeps {
  bookingRepository: BookingRepository;
}

export class BookingActivitySupplementaryDataFetcher {
  private readonly bookingRepository: BookingRepository;

  constructor(deps: BookingActivitySupplementaryDataFetcherDeps) {
    this.bookingRepository = deps.bookingRepository;
  }

  async fetchForBooking(params: {
    bookingUid: string;
    hasCreatedAuditLog: boolean;
  }): Promise<BookingActivitySupplementaryData | null> {
    const booking = await this.bookingRepository.findActivitySupplementaryDataByUid({
      bookingUid: params.bookingUid,
    });

    if (!booking) {
      return null;
    }

    return {
      bookingId: booking.id,
      bookingUid: booking.uid,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      creationSource: booking.creationSource,
      status: booking.status,
      hasCreatedAuditLog: params.hasCreatedAuditLog,
      reminders: booking.reminders,
      integrations: booking.references,
      payments: booking.payment,
    };
  }
}
