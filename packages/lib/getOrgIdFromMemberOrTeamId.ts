import prisma from "@calcom/prisma";

const getOrgMemberOrTeamWhere = (memberId?: number | null, teamId?: number | null) => {
  return {
    OR: [
      {
        AND: [
          {
            members: {
              some: {
                userId: memberId ?? 0,
                accepted: true,
              },
            },
          },
          {
            isOrganization: true,
          },
        ],
      },
      {
        AND: [
          {
            children: {
              some: {
                id: teamId ?? 0,
              },
            },
          },
          {
            isOrganization: true,
          },
        ],
      },
    ],
  };
};

export default async function getOrgIdFromMemberOrTeamId(args: {
  memberId?: number | null;
  teamId?: number | null;
}) {
  const orgId = await prisma.team.findFirst({
    where: getOrgMemberOrTeamWhere(args.memberId, args.teamId),
    select: {
      id: true,
    },
  });
  return orgId?.id;
}

export async function getPublishedOrgIdFromMemberOrTeamId(args: {
  memberId?: number | null;
  teamId?: number | null;
}) {
  const orgId = await prisma.team.findFirst({
    where: {
      ...getOrgMemberOrTeamWhere(args.memberId, args.teamId),
      slug: { not: null },
    },
    select: {
      id: true,
    },
  });
  return orgId?.id;
}
