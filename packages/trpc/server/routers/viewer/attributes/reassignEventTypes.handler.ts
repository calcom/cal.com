import { reassignEventTypesBasedOnAttributes } from "@calcom/lib/server/eventTypeAttributeReassignment";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type ReassignEventTypesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: {
    orgId?: number;
  };
};

const reassignEventTypesHandler = async ({ input, ctx }: ReassignEventTypesOptions) => {
  const org = ctx.user.organization;
  const orgId = input.orgId || org.id;

  if (!orgId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be part of an organization to use this feature",
    });
  }

  const orgMembers = await prisma.membership.findMany({
    where: {
      teamId: orgId,
      accepted: true,
    },
    select: {
      userId: true,
    },
  });

  const affectedUserIds = orgMembers.map((member) => member.userId);

  await reassignEventTypesBasedOnAttributes({
    orgId,
    affectedUserIds,
  });

  return {
    success: true,
    message: "Event types reassigned successfully",
  };
};

export default reassignEventTypesHandler;
