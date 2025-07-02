import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";

type RemoveHostsFromEventTypes = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveHostsFromEventTypes;
};

export async function removeHostsFromEventTypesHandler({ ctx, input }: RemoveHostsFromEventTypes) {
  if (!ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (
    !(await checkPermissionWithFallback({
      userId: ctx.user?.id,
      teamId: ctx.user.organizationId,
      permission: "organization.listMembers",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    }))
  )
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const { userIds, eventTypeIds } = input;

  return await prisma.host.deleteMany({
    where: {
      eventTypeId: {
        in: eventTypeIds,
      },
      userId: {
        in: userIds,
      },
    },
  });
}

export default removeHostsFromEventTypesHandler;
