import { symmetricDecrypt } from "@calcom/lib/crypto";
import { prisma } from "@calcom/prisma";

import { z } from "zod";

import type { TSubmitRatingInputSchema } from "./submitRating.schema";

type SubmitRatingOptions = {
  input: TSubmitRatingInputSchema;
};

const decryptedSchema = z.object({
  bookingUid: z.string(),
})


export const submitRatingHandler = async ({ input }: SubmitRatingOptions) => {
  const { rating, comment, token } = input;


  const { bookingUid } = decryptedSchema.parse(JSON.parse(symmetricDecrypt(
    decodeURIComponent(token),
    process.env.CALENDSO_ENCRYPTION_KEY || ""
  )));

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
