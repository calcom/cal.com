import { prisma } from "@calcom/prisma";

import type { TNoShowInputSchema } from "./noShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, attendeeEmails } = input;
  try {
    if (attendeeEmails && attendeeEmails.length > 0) {
      await prisma.attendee.update({
        where: {
          booking: {
            uid: bookingUid,
          },
          email: {
            in: attendeeEmails,
          },
        },
        data: {
          noShow: true,
        },
      });
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
