import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteOneOffMeetingInputSchema } from "./delete.schema";

type DeleteHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteOneOffMeetingInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteHandlerOptions) => {
  const { id } = input;

  // First verify the user owns this meeting
  const oneOffMeeting = await prisma.oneOffMeeting.findFirst({
    where: {
      id,
      userId: ctx.user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!oneOffMeeting) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One-off meeting not found",
    });
  }

  // Delete the meeting (slots will be cascade deleted)
  await prisma.oneOffMeeting.delete({
    where: {
      id,
    },
  });

  return { success: true };
};

