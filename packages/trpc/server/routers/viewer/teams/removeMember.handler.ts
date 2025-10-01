import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";
import { RemoveMemberServiceFactory } from "./removeMember/RemoveMemberServiceFactory";

type RemoveMemberOptions = {
  ctx: {
    user: {
      id: number;
      organization?: {
        isOrgAdmin: boolean;
      };
    };
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({
  ctx: {
    user: { id: userId, organization },
  },
  input,
}: RemoveMemberOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `removeMember.${userId}`,
  });

  const { memberIds, teamIds, isOrg } = input;
  const isOrgAdmin = organization?.isOrgAdmin ?? false;

  // Note: This assumes that all teams in the request have the same PBAC setting 9999% chance they do.
  const primaryTeamId = teamIds[0];
  if (!primaryTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one team ID must be provided",
    });
  }

  // Get the appropriate service based on feature flag
  const service = await RemoveMemberServiceFactory.create(primaryTeamId);

  const { hasPermission } = await service.checkRemovePermissions({
    userId,
    isOrgAdmin,
    memberIds,
    teamIds,
    isOrg,
  });

  if (!hasPermission) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await service.validateRemoval(
    {
      userId,
      isOrgAdmin,
      memberIds,
      teamIds,
      isOrg,
    },
    hasPermission
  );

  // Perform the removal
  await service.removeMembers(memberIds, teamIds, isOrg);
};

export default removeMemberHandler;
