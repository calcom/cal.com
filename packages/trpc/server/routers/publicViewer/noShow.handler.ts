import { z } from "zod";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { TNoShowInputSchema } from "./noShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

const decryptedSchema = z.object({
  bookingUid: z.string(),
  attendees: z
    .array(
      z.object({
        email: z.string(),
        noShow: z.boolean(),
      })
    )
    .optional(),
});

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { token } = input;

  const { bookingUid, attendees } = decryptedSchema.parse(
    JSON.parse(symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || ""))
  );

  try {
    const attendeeEmails = attendees?.map((attendee) => attendee.email) || [];
    if (attendees && attendeeEmails.length > 0) {
      const allAttendees = await prisma.attendee.findMany({
        where: {
          AND: [
            {
              booking: {
                uid: bookingUid,
              },
              email: {
                in: attendeeEmails,
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
        },
      });

      const updatePromises = attendees.map((attendee) => {
        const attendeeToUpdate = allAttendees.find((a) => a.email === attendee.email);

        if (attendeeToUpdate) {
          return prisma.attendee.update({
            where: { id: attendeeToUpdate.id },
            data: { noShow: attendee.noShow },
          });
        }
      });

      await Promise.all(updatePromises);
    } else {
      await prisma.booking.update({
        where: {
          uid: bookingUid,
        },
        data: {
          noShowHost: true,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
};

export default noShowHandler;
