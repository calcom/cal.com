import type { Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { BookingReferencesFilterInput_2024_08_13 } from "@/ee/bookings/2024-08-13/inputs/booking-references-filter.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

@Injectable()
export class BookingReferencesRepository_2024_08_13 {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getBookingReferences(bookingId: number, filter?: BookingReferencesFilterInput_2024_08_13) {
    const whereClause: Prisma.BookingReferenceWhereInput = { bookingId, deleted: null };

    if (filter?.type) {
      whereClause.type = filter.type;
    }

    return this.dbRead.prisma.bookingReference.findMany({
      where: whereClause,
      select: {
        type: true,
        uid: true,
        id: true,
        externalCalendarId: true,
      },
    });
  }

  async getBookingReferencesIncludeSensitiveCredentials(eventUid: string) {
    return this.dbRead.prisma.bookingReference.findFirst({
      where: {
        uid: eventUid,
        deleted: null,
      },
      include: {
        credential: true,
        delegationCredential: true,
        booking: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }
}
