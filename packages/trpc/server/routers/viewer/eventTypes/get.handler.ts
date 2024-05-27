import getEventTypeById from "@calcom/lib/event-types/getEventTypeById";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = ({ ctx, input }: GetOptions) => {
  return getEventTypeById({
    currentOrganizationId: ctx.user.profile?.organizationId ?? null,
    eventTypeId: input.id,
    userId: ctx.user.id,
    prisma: ctx.prisma,
    isTrpcCall: true,
    isUserOrganizationAdmin: !!ctx.user?.organization?.isOrgAdmin,
  });
};
