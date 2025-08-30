import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { PartialReference } from "@calcom/types/EventManager";

const bookingReferenceSelect = {
  id: true,
  type: true,
  uid: true,
  meetingId: true,
  meetingUrl: true,
  credentialId: true,
  deleted: true,
  bookingId: true,
} satisfies Prisma.BookingReferenceSelect;

export class BookingReferenceRepository {
  static async findDailyVideoReferenceByRoomName({ roomName }: { roomName: string }) {
    return prisma.bookingReference.findFirst({
      where: { type: "daily_video", uid: roomName, meetingId: roomName, bookingId: { not: null } },
      select: bookingReferenceSelect,
    });
  }

  /**
   * If rescheduling a booking with new references from the EventManager. Delete the previous references and replace them with new ones
   */
  static async replaceBookingReferences({
    bookingId,
    newReferencesToCreate,
  }: {
    bookingId: number;
    newReferencesToCreate: PartialReference[];
  }) {
    const newReferenceTypes = newReferencesToCreate.map((reference) => reference.type);

    await prisma.bookingReference.deleteMany({
      where: {
        bookingId,
        type: {
          in: newReferenceTypes,
        },
      },
    });

    await prisma.bookingReference.createMany({
      data: newReferencesToCreate.map((reference) => {
        return { ...reference, bookingId };
      }),
    });
  }
}
