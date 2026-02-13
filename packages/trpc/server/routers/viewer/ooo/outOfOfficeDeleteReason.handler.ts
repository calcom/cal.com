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
  // safe to hard delete than toggling the "enabled" button.
  // If some OOO is already using it, it will then show a default data. 
  // First checking if it's getting used or not will cause one extra call to db. Not really worth it.
  try {
    await prisma.outOfOfficeReason.delete({
      where: {
        id: input.id,
        userId: ctx.user.id,
      },
    });

    return { success: true };
  } catch (error) {
    throw new TRPCError({
        code: "NOT_FOUND",
        message: "Failed to delete custom reason.",
      });
  }
};