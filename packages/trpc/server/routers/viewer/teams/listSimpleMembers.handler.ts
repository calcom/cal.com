/**
 * Simplified version of legacyListMembers.handler.ts that returns basic member info.
 * Used for filtering people on /bookings.
 */
import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ListSimpleMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listSimpleMembers = async ({ ctx }: ListSimpleMembersOptions) => {
  const { isOrgAdmin, isPrivate } = ctx.user.organization;

  return await TeamRepository.listSimpleMembers(ctx.user.id, isOrgAdmin, isPrivate);
};

export default listSimpleMembers;
