import prisma from "@calcom/prisma";

export const getOrgIdFromMemberOrTeamId = async (args: {
  memberId?: number | null;
  teamId?: number | null;
}) => {
  const userId = args.memberId ?? 0;
  const teamId = args.teamId ?? 0;

  console.log(`userId: ${userId}`);
  console.log(`teamId: ${teamId}`);
  const org = await prisma.team.findFirst({
    where: {
      isOrganization: true,
    },
    select: {
      members: true,
    },
  });

  const orgId = await prisma.team.findFirst({
    where: {
      OR: [
        {
          AND: [
            {
              members: {
                some: {
                  userId,
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
                  id: teamId,
                },
              },
            },
            {
              isOrganization: true,
            },
          ],
        },
      ],
    },
    select: {
      id: true,
    },
  });
  return orgId?.id;
};
