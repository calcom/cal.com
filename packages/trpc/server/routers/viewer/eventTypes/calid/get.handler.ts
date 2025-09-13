import { getEventTypeByIdForCalIdTeam } from "@calcom/lib/event-types/getEventTypeById";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TCalIdGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdGetInputSchema;
};

export const getHandler = ({ ctx, input }: GetOptions) => {
  return getEventTypeByIdForCalIdTeam({
    currentOrganizationId: ctx.user.profile?.organizationId ?? null,
    eventTypeId: input.id,
    userId: ctx.user.id,
    prisma: ctx.prisma,
    isTrpcCall: true,
    isUserOrganizationAdmin: !!ctx.user?.organization?.isOrgAdmin,
  });
};
