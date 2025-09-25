import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByCalIdViewer";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TCalIdEventTypeInputSchema } from "./getByViewer.schema";

type CalIdGetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdEventTypeInputSchema;
};

export const getByViewerHandler = async ({ ctx, input }: CalIdGetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getByViewer:${ctx.user.id}`,
    rateLimitingType: "common",
  });
  const user = ctx.user;
  const filters = input?.filters;
  const forRoutingForms = input?.forRoutingForms;

  return await getEventTypesByViewer(user, filters, forRoutingForms);
};
