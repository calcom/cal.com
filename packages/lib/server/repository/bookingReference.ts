import type { SelectedCalendar } from "@prisma/client";
import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { PartialReference } from "@calcom/types/EventManager";

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

const log = logger.getSubLogger({
  prefix: ["BookingReferenceRepository"],
});

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

  /**
   * If previously connected credential is deleted, reconnect with new credential when it is created.
   */
  static async reconnectWithNewCredential({
    credentialId,
    credentialType,
    userId,
    selectedCalendars,
  }: {
    credentialId: number;
    credentialType: string;
    userId: number | null;
    selectedCalendars: Omit<SelectedCalendar, "userId" | "integration" | "credentialId">[];
  }) {
    try {
      const bookingReferences = await prisma.bookingReference.findMany({
        where: {
          type: credentialType,
          booking: {
            userId: userId,
          },
          credentialId: null,
          ...(selectedCalendars.length === 0
            ? { externalCalendarId: null } // for non-calendar apps
            : {
                externalCalendarId: {
                  in: selectedCalendars.map((selectedCalendar) => selectedCalendar.externalId),
                },
              }),
        },
      });
      if (bookingReferences.length > 0) {
        if (credentialType === "google_calendar") {
          // get 'google_meet_video' booking references for the same bookings
          bookingReferences.push(
            ...(await prisma.bookingReference.findMany({
              where: {
                type: "google_meet_video",
                bookingId: {
                  in: bookingReferences
                    .filter((bookingReference) => !!bookingReference.bookingId)
                    .map((bookingReference) => bookingReference.bookingId as number),
                },
                credentialId: null,
              },
            }))
          );
        }
        await prisma.bookingReference.updateMany({
          where: {
            id: {
              in: bookingReferences.map((bookingReference) => bookingReference.id),
            },
          },
          data: {
            credentialId,
          },
        });
      }
    } catch (error) {
      log.error(
        `Error in updateAfterCredentialCreate() while updating bookingReferences for credential id:${credentialId}`,
        safeStringify(error)
      );
    }
  }
}
