import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const getByViewerHandler = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getByViewer:${ctx.user.id}`,
    rateLimitingType: "common",
  });
  const user = ctx.user;
  const filters = input?.filters;
  const forRoutingForms = input?.forRoutingForms;

  return await getEventTypesByViewer(user, filters, forRoutingForms);
};
