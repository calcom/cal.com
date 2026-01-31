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
            userId: true,
            idempotencyKey: true,
            userPrimaryEmail: true,
            title: true,
            description: true,
            customInputs: true,
            responses: true,
            startTime: true,
            endTime: true,
            status: true,
            location: true,
            metadata: true,
            paid: true,
            destinationCalendarId: true,
            cancellationReason: true,
            rejectionReason: true,
            reassignReason: true,
            reassignById: true,
            dynamicEventSlugRef: true,
            dynamicGroupSlugRef: true,
            fromReschedule: true,
            rescheduled: true,
            recurringEventId: true,
            smsReminderNumber: true,
            scheduledJobs: true,
            isRecorded: true,
            iCalUID: true,
            iCalSequence: true,
            rating: true,
            ratingFeedback: true,
            noShowHost: true,
            oneTimePassword: true,
            cancelledBy: true,
            rescheduledBy: true,
            createdAt: true,
            updatedAt: true,
            eventTypeId: true,
            creationSource: true,
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
                    bookingId: true,
                    attendeeId: true,
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
