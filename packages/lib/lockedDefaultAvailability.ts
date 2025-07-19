import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";

/**
 * Checks if a user has locked default availability restrictions.
 * Returns true if the user is a member (not admin/owner) of any team with locked default availability
 * AND is not an admin/owner of any team (which would give them permission to override restrictions).
 */
export async function hasLockedDefaultAvailabilityRestriction(
  userId: number,
  prisma: PrismaClient
): Promise<boolean> {
  const userTeams = await prisma.membership.findMany({
    where: {
      userId,
      accepted: true,
    },
    select: {
      team: {
        select: {
          lockDefaultAvailability: true,
        },
      },
      role: true,
    },
  });

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
export async function checkLockedDefaultAvailabilityRestriction(
  userId: number,
  prisma: PrismaClient,
  errorMessage = "Cannot edit default availability when team has locked default availability setting enabled"
): Promise<void> {
  const hasRestriction = await hasLockedDefaultAvailabilityRestriction(userId, prisma);

  if (hasRestriction) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({
      code: "FORBIDDEN",
      message: errorMessage,
    });
  }
}
