import getEventTypeById from "@calcom/lib/event-types/getEventTypeById";
import { UserRepository } from "@calcom/lib/server/repository/user";
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

export const getHandler = async ({ ctx, input }: GetOptions) => {
  let isUserOrganizationAdmin = false;
  if (ctx.user.organizationId) {
    const userRepository = new UserRepository();
    isUserOrganizationAdmin = await userRepository.isAdminOrOwnerOfTeam({
      userId: ctx.user.id,
      teamId: ctx.user.organizationId,
    });
  }

  return getEventTypeById({
    currentOrganizationId: ctx.user.profile?.organizationId ?? null,
    eventTypeId: input.id,
    userId: ctx.user.id,
    prisma: ctx.prisma,
    isTrpcCall: true,
    isUserOrganizationAdmin,
  });
};
