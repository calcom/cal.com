import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class BookingSeatRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getByReferenceUid(referenceUid: string) {
    return this.dbRead.prisma.bookingSeat.findUnique({
      where: {
        referenceUid,
      },
      include: {
        booking: { select: { uid: true } },
      },
    });
  }

  async getByReferenceUidIncludeBookingWithAttendeesAndUserAndEvent(referenceUid: string) {
    return this.dbRead.prisma.bookingSeat.findUnique({
      where: {
        referenceUid,
      },
      select: {
        id: true,
        referenceUid: true,
        data: true,
        metadata: true,
        bookingId: true,
        attendeeId: true,
        booking: {
          select: {
            id: true,
            uid: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            status: true,
            location: true,
            metadata: true,
            cancellationReason: true,
            fromReschedule: true,
            rescheduled: true,
            rescheduledBy: true,
            noShowHost: true,
            createdAt: true,
            updatedAt: true,
            rating: true,
            iCalUID: true,
            eventTypeId: true,
            recurringEventId: true,
            attendees: {
              select: {
                name: true,
                email: true,
                timeZone: true,
                locale: true,
                phoneNumber: true,
                noShow: true,
                bookingSeat: {
                  select: {
                    id: true,
                    referenceUid: true,
                    data: true,
                    metadata: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
            eventType: {
              select: {
                id: true,
                slug: true,
                seatsShowAttendees: true,
                teamId: true,
                userId: true,
              },
            },
          },
        },
      },
    });
  }
}
