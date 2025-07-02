import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

// export type OrganisationWithMembers = Awaited<ReturnType<typeof getOrganizationMembers>>;

// also returns team
export async function isOrganisationAdmin(userId: number, orgId: number) {
  const { checkPermissionWithFallback } = await import(
    "@calcom/features/pbac/lib/checkPermissionWithFallback"
  );

  return await checkPermissionWithFallback({
    userId,
    teamId: orgId,
    permission: "organization.listMembers",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });
}
export async function isOrganisationOwner(userId: number, orgId: number) {
  const { checkPermissionWithFallback } = await import(
    "@calcom/features/pbac/lib/checkPermissionWithFallback"
  );

  return await checkPermissionWithFallback({
    userId,
    teamId: orgId,
    permission: "organization.changeMemberRole",
    fallbackRoles: [MembershipRole.OWNER],
  });
}

export async function isOrganisationMember(userId: number, orgId: number) {
  return !!(await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId: orgId,
      },
    },
  }));
}
