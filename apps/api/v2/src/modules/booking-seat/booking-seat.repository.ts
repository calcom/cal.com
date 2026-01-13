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
      include: {
        booking: {
          include: {
            attendees: {
              include: {
                bookingSeat: true,
              },
            },
            user: true,
            eventType: true,
          },
        },
      },
    });
  }
}
