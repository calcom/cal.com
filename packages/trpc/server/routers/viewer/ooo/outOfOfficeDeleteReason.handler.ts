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
  try {
    const existingOutOfOfficeEntryWithCustomReason = await prisma.outOfOfficeEntry.findMany({
      where: {
        reasonId: input.id,
        userId: ctx.user.id,
      }
    })

    if(existingOutOfOfficeEntryWithCustomReason.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Your custom reason already in use",
      });
    }

    await prisma.outOfOfficeReason.delete({
      where: {
        id: input.id,
        userId: ctx.user.id,
      },
    });

    return { success: true };
  } catch (error) {
    let errorMessage = "Failed to delete custom reason."
    if(error instanceof Error){
      errorMessage = error.message;
    }
    throw new TRPCError({
        code: "BAD_REQUEST",
        message: errorMessage,
    });
  }
};