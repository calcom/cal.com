import dayjs from "@calcom/dayjs";
import { sendFeedbackEmail } from "@calcom/emails";
import { sendFeedbackFormbricks } from "@calcom/lib/formbricks";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TSubmitFeedbackInputSchema } from "./submitFeedback.schema";

type SubmitFeedbackOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSubmitFeedbackInputSchema;
};

export const submitFeedbackHandler = async ({ ctx, input }: SubmitFeedbackOptions) => {
  const { rating, comment } = input;

  const feedback = {
    username: ctx.user.username || "Nameless",
    email: ctx.user.email || "No email address",
    rating: rating,
    comment: comment,
  };

  await prisma.feedback.create({
    data: {
      date: dayjs().toISOString(),
      userId: ctx.user.id,
      rating: rating,
      comment: comment,
    },
  });
  if (process.env.NEXT_PUBLIC_FORMBRICKS_HOST_URL && process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID)
    sendFeedbackFormbricks(ctx.user.id, feedback);

  if (process.env.SEND_FEEDBACK_EMAIL && comment) sendFeedbackEmail(feedback);
};
