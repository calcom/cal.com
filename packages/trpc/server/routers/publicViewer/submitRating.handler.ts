import { symmetricDecrypt } from "@calcom/lib/crypto";
import { prisma } from "@calcom/prisma";

import { ZSubmitRatingOptionsSchema } from "./submitRating.schema";
import type { TCommonInputSchema } from "./types";

type SubmitRatingOptions = {
  input: TCommonInputSchema;
};

export const submitRatingHandler = async ({ input }: SubmitRatingOptions) => {
  const { token } = input;

  const { bookingUid, rating, comment } = ZSubmitRatingOptionsSchema.parse(
    JSON.parse(symmetricDecrypt(decodeURIComponent(token), process.env.CALENDSO_ENCRYPTION_KEY || ""))
  );

  await prisma.booking.update({
    where: {
      uid: bookingUid,
    },
    data: {
      rating: rating,
      ratingFeedback: comment,
    },
  });
};

export default submitRatingHandler;
