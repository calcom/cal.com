import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TOutOfOfficeReasonDelete } from "./outOfOfficeReasonDelete.schema";

type TOutOfOfficeReasonDeleteInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOutOfOfficeReasonDelete;
};

export const outOfOfficeReasonDelete = async ({ ctx, input }: TOutOfOfficeReasonDeleteInput) => {
  const reason = await prisma.outOfOfficeReason.findUnique({
    where: { id: input.reasonId },
    select: { id: true, userId: true },
  });

  if (!reason) {
    throw new TRPCError({ code: "NOT_FOUND", message: "reason_not_found" });
  }

  if (reason.userId !== ctx.user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "only_custom_reasons_can_be_deleted" });
  }

  await prisma.outOfOfficeReason.delete({
    where: { id: input.reasonId },
  });

  return { success: true };
};
