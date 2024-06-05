import prisma from "@calcom/prisma";

export default async function getOrgIdFromMemberOrTeamId(args: {
  memberId?: number | null;
  teamId?: number | null;
}) {
  const userId = args.memberId ?? 0;
  const teamId = args.teamId ?? 0;

  const orgId = await prisma.team.findFirst({
    where: {
      OR: [
        {
          AND: [
            {
              members: {
                some: {
                  userId,
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
}
