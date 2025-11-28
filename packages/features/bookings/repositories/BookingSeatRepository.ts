import type { PrismaClient } from "@calcom/prisma";

export class BookingSeatRepository {
  constructor(private prismaClient: PrismaClient) {}

  getByUidIncludeAttendee(uid: string) {
    return this.prismaClient.bookingSeat.findUnique({
      where: {
        referenceUid: uid,
      },
      include: {
        attendee: true,
      },
    });
  }
}
