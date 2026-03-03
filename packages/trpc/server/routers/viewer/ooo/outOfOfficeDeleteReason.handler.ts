import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TDeleteCustomReasonSchema } from "./outOfOfficeDeleteReason.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteCustomReasonSchema;
};

export const outOfOfficeDeleteReason = async ({ ctx, input }: DeleteOptions) => {
  const existingOutOfOfficeEntryWithCustomReason = await prisma.outOfOfficeEntry.findMany({
    where: {
      reasonId: input.id,
      userId: ctx.user.id,
    },
  });

  if (existingOutOfOfficeEntryWithCustomReason.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Your custom reason already in use",
    });
  }

  const reason = await prisma.outOfOfficeReason.findFirst({
    where: { id: input.id, userId: ctx.user.id },
  });
  if (!reason) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom reason not found" });
  }

  try {
    await prisma.outOfOfficeReason.delete({ where: { id: input.id } });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete custom reason",
    });
  }

  return { success: true };
};
