import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { PartialReference } from "@calcom/types/EventManager";

import { CredentialRepository } from "./credential";

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
   * Whenever a new Booking is created, a BookingReference is also created and is connected with Credential record by 'CredentialId'.
   * If for some reason a App is uninstalled and installed, the Credential record is deleted and BookingReference is orphaned by 'CredentialId' field being set to null.
   * This function detects the orphaned BookingReference whenever a new Credential is created and reconnects it.
   * So, this function has to be called whenever a new Credential record is created.
   * The combination of 3 fields - 'userId or teamId' , 'credentialType' , 'credentialId==null' is used to detect orphaned bookingReference.
   * For Calendar Apps, additional field - 'externalCalendarId' is used to detect orphaned bookingReferences.
   * Hence, this function has to be called also whenever a new SelectedCalendar (linked with credential) record is added.
   */
  static async reconnectWithNewCredential(newCredentialId: number) {
    try {
      const newCredential = await CredentialRepository.findByIdWithSelectedCalendar({
        id: newCredentialId,
      });

      if (!newCredential) {
        throw new Error("Credential not found.");
      }

      //In case of credential created for a team, get member userIds
      let teamMembersUserIds: number[] = [];
      if (newCredential.teamId && !newCredential.userId) {
        const members = await prisma.membership.findMany({
          where: {
            teamId: newCredential.teamId,
          },
          select: {
            userId: true,
          },
        });
        teamMembersUserIds = members.map((member) => member.userId);
      }

      //Detect bookingReferences to connect with new Credential.
      const bookingReferences = await prisma.bookingReference.findMany({
        where: {
          type: newCredential.type,
          booking: {
            ...(newCredential.userId
              ? { userId: newCredential.userId }
              : { userId: { in: teamMembersUserIds } }),
          },
          credentialId: null,
          ...(!newCredential.selectedCalendars || newCredential.selectedCalendars.length === 0
            ? { externalCalendarId: null } // for non-calendar apps
            : {
                externalCalendarId: {
                  in: newCredential.selectedCalendars
                    .filter((selectedCalendar) => !!selectedCalendar.externalId)
                    .map((selectedCalendar) => selectedCalendar.externalId as string),
                },
              }),
        },
        select: {
          id: true,
          bookingId: true,
        },
      });

      if (bookingReferences.length > 0) {
        //Detect additional bookingReferences in case of 'google_calendar'.
        if (newCredential.type === "google_calendar") {
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
              select: {
                id: true,
                bookingId: true,
              },
            }))
          );
        }

        //Connect detected bookingReferences with new Credential.
        await prisma.bookingReference.updateMany({
          where: {
            id: {
              in: bookingReferences.map((bookingReference) => bookingReference.id),
            },
          },
          data: {
            credentialId: newCredential.id,
          },
        });
      }
    } catch (error) {
      log.error(
        `Error in reconnectWithNewCredential() for credential id:${newCredentialId}`,
        safeStringify(error)
      );
    }
  }
}
