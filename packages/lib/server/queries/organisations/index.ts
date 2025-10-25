import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

// export type OrganisationWithMembers = Awaited<ReturnType<typeof getOrganizationMembers>>;

// also returns team
export async function isOrganisationAdmin(userId: number, orgId: number) {
  return (
    (await prisma.membership.findFirst({
      where: {
        userId,
        teamId: orgId,
        OR: [{ role: MembershipRole.ADMIN }, { role: MembershipRole.OWNER }],
      },
    })) || false
  );
}
export async function isOrganisationOwner(userId: number, orgId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId: orgId,
      role: MembershipRole.OWNER,
    },
  }));
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

async function getOrgIdsWhereAdmin(loggedInUserId: number) {
  const loggedInUserOrgMemberships = await prisma.membership.findMany({
    where: {
      userId: loggedInUserId,
      role: {
        in: [MembershipRole.OWNER, MembershipRole.ADMIN],
      },
      team: {
        parentId: null,
      },
    },
    select: {
      teamId: true,
    },
  });

  return loggedInUserOrgMemberships.map((m) => m.teamId);
}

export async function isLoggedInUserOrgAdminOfBookingUser(loggedInUserId: number, bookingUserId: number) {
  const orgIdsWhereLoggedInUserAdmin = await getOrgIdsWhereAdmin(loggedInUserId);

  if (orgIdsWhereLoggedInUserAdmin.length === 0) {
    return false;
  }

  const bookingUserOrgMembership = await prisma.membership.findFirst({
    where: {
      userId: bookingUserId,
      teamId: {
        in: orgIdsWhereLoggedInUserAdmin,
      },
      team: {
        parentId: null,
      },
    },
  });

  if (bookingUserOrgMembership) return true;

  const bookingUserOrgTeamMembership = await prisma.membership.findFirst({
    where: {
      userId: bookingUserId,
      team: {
        parentId: {
          in: orgIdsWhereLoggedInUserAdmin,
        },
      },
    },
  });

  return !!bookingUserOrgTeamMembership;
}
