import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

/**
 * Checks if a user has locked default availability restrictions.
 * Returns true if the user is a member (not admin/owner) of any team with locked default availability
 * AND is not an admin/owner of any team (which would give them permission to override restrictions).
 */
export async function hasLockedDefaultAvailabilityRestriction(userId: number): Promise<boolean> {
  const membershipRepository = new MembershipRepository(prisma);
  const userTeams = await membershipRepository.findUserTeamMembershipsWithLockStatus({ userId });

  const hasLockedTeamMembership = userTeams.some(
    (membership) => membership.team.lockDefaultAvailability && membership.role === MembershipRole.MEMBER
  );

  const hasAdminOrOwnerRole = userTeams.some(
    (membership) => membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER
  );

  // Only block if user has locked team membership AND is not an admin/owner of any team
  return hasLockedTeamMembership && !hasAdminOrOwnerRole;
}

/**
 * Checks if a user has locked default availability restrictions and throws a TRPC error if they do.
 * This is a convenience function that combines the check with error throwing.
 */
export async function checkLockedDefaultAvailabilityRestriction(userId: number): Promise<void> {
  const hasRestriction = await hasLockedDefaultAvailabilityRestriction(userId);

  if (hasRestriction) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot edit default availability when team has locked default availability setting enabled",
    });
  }
}
