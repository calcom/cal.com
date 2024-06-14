import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TPrevResponseInputSchema } from "./prevResponse.schema";

type PrevResponseOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TPrevResponseInputSchema;
};

export const prevResponseHandler = async ({ ctx, input }: PrevResponseOptions) => {
  const { eventTypeId } = input;
  const { user, prisma } = ctx;

  return await prisma.booking.findFirst({
    where: {
      eventTypeId,
      attendees: {
        some: {
          email: user.email,
        },
      },
    },
    select: {
      responses: true,
    },
  });
};
