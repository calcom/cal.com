// Cache bust: removed workflow.team.members from eventType select
import getEventTypeById from "@calcom/features/eventtypes/lib/getEventTypeById";
import type { EventType } from "@calcom/features/eventtypes/lib/getEventTypeById";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = ({ ctx, input }: GetOptions): Promise<EventType> => {
  return getEventTypeById({
    currentOrganizationId: ctx.user.profile?.organizationId ?? null,
    eventTypeId: input.id,
    userId: ctx.user.id,
    prisma: ctx.prisma,
    isTrpcCall: true,
    isUserOrganizationAdmin: !!ctx.user?.organization?.isOrgAdmin,
    userLocale: ctx.user.locale,
  });
};
