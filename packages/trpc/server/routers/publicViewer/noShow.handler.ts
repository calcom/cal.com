import { prisma } from "@calcom/prisma";

import type { TNoShowInputSchema } from "./noShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid } = input;
  await prisma.booking.update({
    where: {
      uid: bookingUid,
    },
    data: {
      noShowHost: true,
    },
  });
};

export default noShowHandler;
