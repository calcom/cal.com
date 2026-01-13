import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingSeatRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

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

  async getByReferenceUidIncludeAttendee(referenceUid: string) {
    return this.dbRead.prisma.bookingSeat.findUnique({
      where: {
        referenceUid,
      },
      include: {
        booking: {
          select: {
            uid: true,
            eventType: {
              select: {
                id: true,
                teamId: true,
                userId: true,
                seatsShowAttendees: true,
              },
            },
          },
        },
        attendee: true,
      },
    });
  }
}
