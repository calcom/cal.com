import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";

export const outOfOfficeCustomReasonDelete = async ({
  ctx,
  input,
}: {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: { id: number };
}) => {
  const row = await prisma.outOfOfficeReason.findFirst({
    where: { id: input.id, userId: ctx.user.id },
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "custom_reason_not_found" });
  }

  const entryUsingReason = await prisma.outOfOfficeEntry.findFirst({
    where: { reasonId: input.id },
  });
  if (entryUsingReason) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "custom_reason_in_use" });
  }

  await prisma.outOfOfficeReason.delete({
    where: { id: input.id },
  });

  return { ok: true };
};
