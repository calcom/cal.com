import prisma from "@calcom/prisma";

// export type OrganisationWithMembers = Awaited<ReturnType<typeof getOrganizationMembers>>;

// also returns team
export async function isOrganisationAdmin(userId: number, orgId: number) {
  return (
    (await prisma.membership.findFirst({
      where: {
        userId,
        teamId: orgId,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
    })) || false
  );
}
export async function isOrganisationOwner(userId: number, orgId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId: orgId,
      role: "OWNER",
    },
  }));
}

export async function isOrganisationMember(userId: number, orgId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId: orgId,
    },
  }));
}
