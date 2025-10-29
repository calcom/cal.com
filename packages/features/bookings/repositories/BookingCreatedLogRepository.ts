import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export interface CreateBookingCreatedLogData {
  bookingUid: string;
  selectedCalendarIds: string[];
  availabilitySnapshot: {
    dateRanges: { start: string; end: string }[];
    oooExcludedDateRanges: { start: string; end: string }[];
  } | null;
}

export class BookingCreatedLogRepository {
  constructor(private readonly prismaClient: PrismaClient | Prisma.TransactionClient) {}

  async create(data: CreateBookingCreatedLogData) {
    return await this.prismaClient.bookingCreatedLog.create({
      data: {
        bookingUid: data.bookingUid,
        selectedCalendarIds: { set: data.selectedCalendarIds },
        availabilitySnapshot: data.availabilitySnapshot ?? undefined,
      },
    });
  }
}
