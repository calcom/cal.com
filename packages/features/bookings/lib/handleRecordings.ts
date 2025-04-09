import type { Booking, BookingReference } from "@prisma/client";

import { getDelegationCredentialOrFindRegularCredential } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { deleteRecording, getRecordingsOfCalVideoByRoomName } from "@calcom/lib/videoClient";
import type { GetRecordingsResponseSchema } from "@calcom/prisma/zod-utils";

const log = logger.getSubLogger({ prefix: ["[handleRecordings]"] });

export async function deleteBookingRecordings(
  booking: Booking & {
    references: BookingReference[];
  },
  delegationCredentials: any[] = []
) {
  let hasDeletedRecordings = false;

  try {
    for (const reference of booking.references) {
      if (!reference.type.includes("_video")) continue;

      const credential = await getDelegationCredentialOrFindRegularCredential({
        id: {
          credentialId: reference.credentialId,
          delegationCredentialId: reference.delegationCredentialId,
        },
        delegationCredentials,
      });

      if (!credential) continue;

      try {
        const recordings = await getRecordingsOfCalVideoByRoomName(reference.uid);

        if (!recordings || !("data" in recordings) || !recordings.data.length) continue;

        for (const recording of recordings.data) {
          try {
            await deleteRecording(credential, recording.id);
            hasDeletedRecordings = true;
            log.debug(`Deleted recording: ${recording.id} for booking: ${booking.id}`);
          } catch (err) {
            log.error(`Failed to delete recording: ${recording.id}`, err);
          }
        }
      } catch (err) {
        log.error(`Error getting recordings for room: ${reference.uid}`, err);
      }
    }
  } catch (err) {
    log.error(`Error deleting recordings for booking: ${booking.id}`, err);
  }

  return hasDeletedRecordings;
}
