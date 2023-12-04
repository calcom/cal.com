import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateCalendarSyncInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateCalendarSyncInputSchema;
};
export const listHandler = async ({ ctx, input }: CreateOptions) => {
  const list = await prisma.calendarSyncTask.findMany({
    select: {
      id: true,
      allDayEventConfig: true,
      sourceExternalId: true,
      toExternalId: true,
      sourceCredentialId: true,
      toCredentialId: true,
      enabled: true,
      privacy: true,
      color: true,
      toCredential: {
        select: {
          id: true,
          type: true,
        },
      },
    },
    where: {
      userId: ctx.user.id,
    },
  });
  return list;
};
