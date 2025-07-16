import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TDeleteMemberInputSchema } from "./deleteMember.schema";

type DeleteMemberOptions = {
  ctx: {
    user: TrpcSessionUser;
  };
  input: TDeleteMemberInputSchema;
};

export const deleteMemberHandler = async ({ ctx, input }: DeleteMemberOptions) => {
  const { membershipId } = input;

  // Find the membership to ensure it exists
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          isOrganization: true,
        },
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Membership not found",
    });
  }

  // Delete the membership
  await prisma.membership.delete({
    where: { id: membershipId },
  });

  return {
    success: true,
    message: `Removed ${membership.user.name || membership.user.email} from ${membership.team.name}`,
  };
};

export default deleteMemberHandler;
