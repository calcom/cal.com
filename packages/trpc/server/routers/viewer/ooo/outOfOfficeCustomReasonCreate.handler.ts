import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TOutOfOfficeCustomReasonCreateSchema } from "./outOfOfficeCustomReasonCreate.schema";

export const outOfOfficeCustomReasonCreate = async ({
  ctx,
  input,
}: {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TOutOfOfficeCustomReasonCreateSchema;
}) => {
  const created = await prisma.outOfOfficeReason.create({
    data: {
      userId: ctx.user.id,
      emoji: input.emoji.trim(),
      reason: input.reason.trim(),
      enabled: true,
    },
  });

  return created;
};
