import { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

const bookingReferenceSelect = Prisma.validator<Prisma.BookingReferenceSelect>()({
  id: true,
  type: true,
  uid: true,
  meetingId: true,
  meetingUrl: true,
  credentialId: true,
  deleted: true,
  bookingId: true,
});

export class BookingReferenceRepository {
  static async findDailyVideoReferenceByRoomName({ roomName }: { roomName: string }) {
    return prisma.bookingReference.findFirst({
      where: { type: "daily_video", uid: roomName, meetingId: roomName, bookingId: { not: null } },
      select: bookingReferenceSelect,
    });
  }
}
