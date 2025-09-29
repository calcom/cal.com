import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
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

export class PrismaBookingReferenceRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findDailyVideoReferenceByRoomName({ roomName }: { roomName: string }) {
    return this.prismaClient.bookingReference.findFirst({
      where: { type: "daily_video", uid: roomName, meetingId: roomName, bookingId: { not: null } },
      select: bookingReferenceSelect,
    });
  }

  /**
   * If rescheduling a booking with new references from the EventManager. Delete the previous references and replace them with new ones
   */
  async replaceBookingReferences({
    bookingId,
    newReferencesToCreate,
  }: {
    bookingId: number;
    newReferencesToCreate: PartialReference[];
  }) {
    const newReferenceTypes = newReferencesToCreate.map((reference) => reference.type);

    await this.prismaClient.$transaction([
      this.prismaClient.bookingReference.deleteMany({
        where: {
          bookingId,
          type: {
            in: newReferenceTypes,
          },
        },
      }),
      this.prismaClient.bookingReference.createMany({
        data: newReferencesToCreate.map((reference) => {
          return { ...reference, bookingId };
        }),
      }),
    ]);
  }

  async delete(id: number) {
    await this.prismaClient.bookingReference.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async deleteBookingReferences({ bookingId }: { bookingId: number }) {
    await this.prismaClient.bookingReference.updateMany({
      where: {
        bookingId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findBookingReferences({ bookingId }: { bookingId: number }) {
    return await this.prismaClient.bookingReference.findMany({
      where: {
        bookingId,
        deletedAt: null,
      },
      select: bookingReferenceSelect,
    });
  }

  async findBookingReferenceById(id: number) {
    return await this.prismaClient.bookingReference.findFirst({
      where: { id, deletedAt: null },
      select: bookingReferenceSelect,
    });
  }

  async findByBookingAndApp({ bookingId, appType }: { bookingId: number; appType: string }) {
    return await this.prismaClient.bookingReference.findMany({
      where: {
        type: appType,
        deletedAt: null,
        booking: {
          id: bookingId,
        },
      },
    });
  }

  async findByUserId({ userId }: { userId: number }) {
    return await this.prismaClient.bookingReference.findMany({
      where: {
        deletedAt: null,
        booking: {
          userId,
        },
      },
    });
  }
}
